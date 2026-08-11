import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, favorites } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/money";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  refunded: "Возврат",
};

export default async function AccountOverview() {
  const customer = (await getCurrentCustomer())!;

  const [recentOrders, favCount] = await Promise.all([
    db.query.orders.findMany({
      where: eq(orders.customerId, customer.id),
      orderBy: [desc(orders.createdAt)],
      limit: 5,
    }),
    db.$count(favorites, eq(favorites.customerId, customer.id)),
  ]);

  const totalOrders = await db.$count(orders, eq(orders.customerId, customer.id));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-serif">Мой кабинет</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Заказов" value={totalOrders} />
        <Stat label="Избранное" value={favCount} />
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-serif">Последние заказы</h2>
          {totalOrders > 0 && <Link href="/account/orders" className="text-xs underline">Все заказы</Link>}
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-neutral-500">Пока нет заказов. <Link href="/catalog" className="underline">В каталог</Link></p>
        ) : (
          <div className="border divide-y">
            {recentOrders.map((o) => (
              <Link key={o.id} href={`/account/orders/${o.number}`} className="flex items-center justify-between p-4 hover:bg-neutral-50">
                <div>
                  <div className="text-sm font-medium">№ {o.number}</div>
                  <div className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleDateString("ru-RU")} · {ORDER_STATUS_LABEL[o.status] ?? o.status}</div>
                </div>
                <div className="text-sm">{formatPrice(o.totalTiyin)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border p-4">
      <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="text-2xl font-serif mt-1">{value}</div>
    </div>
  );
}
