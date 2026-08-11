import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { DELIVERY_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from "@/lib/order-labels";
import { tiyinToSum } from "@/lib/money";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const conditions = status ? [eq(orders.status, status as never)] : [];

  const rows = await db
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(5000);

  const header = [
    "Номер","Дата","Клиент","Телефон","Статус","Оплата","Доставка","Адрес",
    "Сумма товаров, сум","Доставка, сум","Итого, сум","Менеджер","Комментарий",
  ];
  const lines = [header.join(";")];
  for (const o of rows) {
    lines.push([
      o.number,
      new Date(o.createdAt).toISOString(),
      o.customerName,
      o.customerPhone,
      ORDER_STATUS_LABEL[o.status] ?? o.status,
      PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod,
      DELIVERY_LABEL[o.deliveryMethod] ?? o.deliveryMethod,
      o.deliveryAddress ?? "",
      tiyinToSum(o.subtotalTiyin),
      tiyinToSum(o.deliveryCostTiyin),
      tiyinToSum(o.totalTiyin),
      o.acceptedByManager ?? "",
      o.comment ?? "",
    ].map(csvEscape).join(";"));
  }

  const body = "\uFEFF" + lines.join("\n"); // BOM для Excel
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
