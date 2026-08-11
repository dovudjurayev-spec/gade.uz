import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
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

export default async function OrdersPage() {
  const customer = (await getCurrentCustomer())!;
  const list = await db.query.orders.findMany({
    where: eq(orders.customerId, customer.id),
    orderBy: [desc(orders.createdAt)],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif">Мои заказы</h1>
      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">Заказов пока нет.</p>
      ) : (
        <div className="border divide-y">
          {list.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.number}`} className="flex items-center justify-between p-4 hover:bg-neutral-50">
              <div>
                <div className="text-sm font-medium">№ {o.number}</div>
                <div className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleString("ru-RU")} · {STATUS[o.status] ?? o.status}</div>
              </div>
              <div className="text-sm">{formatPrice(o.totalTiyin)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
