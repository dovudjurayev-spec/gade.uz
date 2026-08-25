import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { customers, orderItems, orders, outboundQueue, products } from "@/db/schema";
import { normalizePhoneUz } from "@/lib/phone";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  calculateCourierPriceTiyin,
  isWithinDeliveryZone,
  routeDistanceKm,
} from "@/lib/delivery";
import { loadDeliveryTariff } from "@/lib/delivery-server";
import { processQueue } from "@/services/queue/processor";

const cartLineSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(999),
});

export const createOrderSchema = z.object({
  name: z.string().trim().min(2).max(200),
  phone: z.string().min(5),
  deliveryMethod: z.enum(["courier_tashkent", "region_shipping", "pickup"]),
  paymentMethod: z.enum(["payme", "click", "card_on_delivery", "cash_on_delivery"]),
  address: z.string().trim().max(500).optional(),
  deliveryLat: z.number().gte(-90).lte(90).optional(),
  deliveryLng: z.number().gte(-180).lte(180).optional(),
  comment: z.string().trim().max(1000).optional(),
  promoCode: z.string().trim().max(64).optional(),
  items: z.array(cartLineSchema).min(1).max(100),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type CreateOrderResult =
  | { ok: true; orderId: number; orderNumber: string }
  | { ok: false; error: string };


export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Проверьте заполнение формы" };
  }
  const data = parsed.data;

  const phone = normalizePhoneUz(data.phone);
  if (!phone) return { ok: false, error: "Неверный номер телефона" };

  if (data.deliveryMethod !== "pickup" && !data.address) {
    return { ok: false, error: "Укажите адрес доставки" };
  }

  const productIds = data.items.map((i) => i.productId);
  const productRows = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      priceTiyin: products.priceTiyin,
      stock: products.stock,
      isVisible: products.isVisible,
    })
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.isVisible, true)));

  const byId = new Map(productRows.map((p) => [p.id, p]));
  let subtotal = 0;
  const preparedItems: {
    productId: number;
    productName: string;
    sku: string;
    quantity: number;
    priceTiyin: number;
    totalTiyin: number;
  }[] = [];

  for (const line of data.items) {
    const p = byId.get(line.productId);
    if (!p) return { ok: false, error: `Товар недоступен` };
    if (p.stock < line.quantity) {
      return { ok: false, error: `Недостаточно на складе: ${p.name}` };
    }
    const totalTiyin = p.priceTiyin * line.quantity;
    subtotal += totalTiyin;
    preparedItems.push({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      quantity: line.quantity,
      priceTiyin: p.priceTiyin,
      totalTiyin,
    });
  }

  const tariff = await loadDeliveryTariff();
  let deliveryCost = 0;
  let deliveryDistanceKm: number | null = null;
  if (data.deliveryMethod === "courier_tashkent") {
    if (data.deliveryLat == null || data.deliveryLng == null) {
      return { ok: false, error: "Отметьте точку доставки на карте" };
    }
    const dest = { lat: data.deliveryLat, lng: data.deliveryLng };
    if (!isWithinDeliveryZone(dest)) {
      return { ok: false, error: "Точка вне зоны доставки по Ташкенту" };
    }
    deliveryDistanceKm = routeDistanceKm(dest);
    deliveryCost = calculateCourierPriceTiyin(deliveryDistanceKm, subtotal, tariff);
  } else if (data.deliveryMethod === "region_shipping") {
    deliveryCost = tariff.regionTiyin;
  }

  const total = subtotal + deliveryCost;
  const initialStatus =
    data.paymentMethod === "payme" || data.paymentMethod === "click"
      ? "pending_payment"
      : "confirmed";

  const current = await getCurrentCustomer();

  const result = await db.transaction(async (tx) => {
    let customer: { id: number } | undefined;
    if (current) {
      const [updated] = await tx
        .update(customers)
        .set({ name: data.name, phone })
        .where(eq(customers.id, current.id))
        .returning({ id: customers.id });
      customer = updated;
    } else {
      const [upserted] = await tx
        .insert(customers)
        .values({ phone, name: data.name })
        .onConflictDoUpdate({
          target: customers.phone,
          set: { name: data.name },
        })
        .returning({ id: customers.id });
      customer = upserted;
    }

    // monotonic order number: yy + 6-digit sequence, based on id
    const [inserted] = await tx
      .insert(orders)
      .values({
        number: "PENDING",
        customerId: customer!.id,
        customerName: data.name,
        customerPhone: phone,
        status: initialStatus,
        paymentMethod: data.paymentMethod,
        deliveryMethod: data.deliveryMethod,
        deliveryAddress: data.address ?? null,
        deliveryLat: data.deliveryLat != null ? String(data.deliveryLat) : null,
        deliveryLng: data.deliveryLng != null ? String(data.deliveryLng) : null,
        deliveryDistanceKm:
          deliveryDistanceKm != null ? deliveryDistanceKm.toFixed(2) : null,
        deliveryCostTiyin: deliveryCost,
        subtotalTiyin: subtotal,
        totalTiyin: total,
        promoCode: data.promoCode ?? null,
        comment: data.comment ?? null,
      })
      .returning({ id: orders.id });

    const orderId = inserted!.id;
    const number = generateOrderNumber(orderId);

    await tx.update(orders).set({ number }).where(eq(orders.id, orderId));

    await tx.insert(orderItems).values(
      preparedItems.map((i) => ({
        orderId,
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        priceTiyin: i.priceTiyin,
        totalTiyin: i.totalTiyin,
      })),
    );

    // decrement stock (soft reservation; real reservation is Billz job)
    for (const i of preparedItems) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${i.quantity}` })
        .where(eq(products.id, i.productId));
    }

    // enqueue Telegram + CRM jobs (site never blocks on external systems)
    await tx.insert(outboundQueue).values([
      { kind: "telegram_order", payload: { orderId } },
      { kind: "crm_order", payload: { orderId } },
    ]);

    return { orderId, number };
  });

  // Fire-and-forget: drain queue so Telegram notification is sent immediately
  // without waiting for cron. Errors are retried by the processor itself.
  void processQueue().catch((e) => console.error("[create-order] processQueue failed:", e));

  return { ok: true, orderId: result.orderId, orderNumber: result.number };
}

function generateOrderNumber(id: number): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  return `${yy}-${String(id).padStart(6, "0")}`;
}
