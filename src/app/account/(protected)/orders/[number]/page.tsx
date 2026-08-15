import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orderItems, orders } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/money";

const STATUS: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

const PAYMENT: Record<string, string> = {
  payme: "Payme",
  click: "Click",
  card_on_delivery: "Картой курьеру",
  cash_on_delivery: "Наличные курьеру",
};

const DELIVERY: Record<string, string> = {
  courier_tashkent: "Курьер по Ташкенту",
  region_shipping: "Доставка в регион",
  pickup: "Самовывоз",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const customer = (await getCurrentCustomer())!;
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.number, number), eq(orders.customerId, customer.id)),
  });
  if (!order) notFound();

  const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, order.id) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-sans">Заказ № {order.number}</h1>
        <div className="text-sm text-neutral-500 mt-1">
          {new Date(order.createdAt).toLocaleString("ru-RU")} · {STATUS[order.status] ?? order.status}
        </div>
      </div>

      <section className="border divide-y">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between p-4">
            <div>
              <div className="text-sm">{it.productName}</div>
              <div className="text-xs text-neutral-500">{it.sku} · {it.quantity} шт × {formatPrice(it.priceTiyin)}</div>
            </div>
            <div className="text-sm">{formatPrice(it.totalTiyin)}</div>
          </div>
        ))}
      </section>

      <section className="border p-4 space-y-2 text-sm">
        <Row label="Оплата" value={PAYMENT[order.paymentMethod] ?? order.paymentMethod} />
        <Row label="Доставка" value={DELIVERY[order.deliveryMethod] ?? order.deliveryMethod} />
        {order.deliveryAddress && <Row label="Адрес" value={order.deliveryAddress} />}
        {order.comment && <Row label="Комментарий" value={order.comment} />}
        <div className="border-t mt-2 pt-2 space-y-1">
          <Row label="Товары" value={formatPrice(order.subtotalTiyin)} />
          <Row label="Доставка" value={order.deliveryCostTiyin === 0 ? "Бесплатно" : formatPrice(order.deliveryCostTiyin)} />
          {order.discountTiyin > 0 && <Row label="Скидка" value={`− ${formatPrice(order.discountTiyin)}`} />}
          <Row label="Итого" value={formatPrice(order.totalTiyin)} bold />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500 shrink-0">{label}</span>
      <span className={`text-right break-words ${bold ? "font-medium" : ""}`}>{value}</span>
    </div>
  );
}
