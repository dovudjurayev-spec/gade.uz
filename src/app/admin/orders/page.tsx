import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { formatPrice } from "@/lib/money";
import { formatPhoneUz } from "@/lib/phone";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_LABEL } from "@/lib/order-labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заказы · Админка" };

type SP = Promise<{ status?: string; q?: string }>;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const conditions = [];
  if (sp.status) conditions.push(eq(orders.status, sp.status as never));
  if (sp.q) conditions.push(sql`(${orders.number} ilike ${"%" + sp.q + "%"} or ${orders.customerPhone} ilike ${"%" + sp.q + "%"})`);

  const rows = await db
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  const statuses = Object.keys(ORDER_STATUS_LABEL);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Заказы</h1>
        <a
          href={`/api/admin/orders/export${sp.status ? `?status=${sp.status}` : ""}`}
          className="text-sm underline"
        >
          Экспорт CSV
        </a>
      </div>

      <form className="flex flex-wrap gap-2 mb-6" method="get">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Номер или телефон"
          className="border h-10 px-3 text-sm"
        />
        <select name="status" defaultValue={sp.status ?? ""} className="border h-10 px-3 text-sm">
          <option value="">Все статусы</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button className="bg-brand text-white px-4 h-10 text-sm">Фильтр</button>
        <Link href="/admin/orders" className="text-sm underline self-center">Сбросить</Link>
      </form>

      <div className="bg-white border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <Th>№</Th>
              <Th>Дата</Th>
              <Th>Клиент</Th>
              <Th>Телефон</Th>
              <Th>Сумма</Th>
              <Th>Оплата</Th>
              <Th>Статус</Th>
              <Th>Менеджер</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-neutral-500">
                  Заказов нет
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="border-t hover:bg-neutral-50">
                <Td><Link href={`/admin/orders/${o.id}`} className="text-blue-700 hover:underline">{o.number}</Link></Td>
                <Td>{new Date(o.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}</Td>
                <Td>{o.customerName}</Td>
                <Td>{formatPhoneUz(o.customerPhone)}</Td>
                <Td>{formatPrice(o.totalTiyin)}</Td>
                <Td>{PAYMENT_LABEL[o.paymentMethod]}</Td>
                <Td>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${ORDER_STATUS_TONE[o.status] ?? ""}`}>
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </Td>
                <Td>{o.acceptedByManager ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
