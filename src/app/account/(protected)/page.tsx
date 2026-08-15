import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Package, Heart, ShoppingBag } from "lucide-react";
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

const ORDER_STATUS_DOT: Record<string, string> = {
  pending_payment: "bg-amber-500",
  paid: "bg-emerald-500",
  processing: "bg-blue-500",
  shipped: "bg-indigo-500",
  delivered: "bg-neutral-400",
  cancelled: "bg-red-500",
  refunded: "bg-neutral-400",
};

export default async function AccountOverview() {
  const customer = (await getCurrentCustomer())!;

  const [recentOrders, favCount, totalOrders] = await Promise.all([
    db.query.orders.findMany({
      where: eq(orders.customerId, customer.id),
      orderBy: [desc(orders.createdAt)],
      limit: 5,
    }),
    db.$count(favorites, eq(favorites.customerId, customer.id)),
    db.$count(orders, eq(orders.customerId, customer.id)),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-1">
          Добро пожаловать
        </div>
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight">Мой кабинет</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          href="/account/orders"
          icon={<Package className="h-5 w-5" strokeWidth={1.5} />}
          label="Заказов"
          value={totalOrders}
        />
        <StatCard
          href="/account/favorites"
          icon={<Heart className="h-5 w-5" strokeWidth={1.5} />}
          label="Избранное"
          value={favCount}
        />
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-medium tracking-tight">Последние заказы</h2>
          {totalOrders > 0 && (
            <Link
              href="/account/orders"
              className="text-xs text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              Все заказы <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="border border-dashed border-neutral-300 rounded-2xl px-6 py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-neutral-100 grid place-items-center mb-4">
              <ShoppingBag className="h-5 w-5 text-neutral-500" strokeWidth={1.5} />
            </div>
            <div className="text-sm text-neutral-700 mb-1">Пока нет заказов</div>
            <p className="text-xs text-neutral-500 mb-5">
              Оформите первый заказ — здесь появится история покупок.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 bg-neutral-900 text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
            >
              В каталог
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        ) : (
          <div className="border border-neutral-200 rounded-2xl divide-y divide-neutral-200 overflow-hidden">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.number}`}
                className="flex items-center justify-between gap-4 p-4 md:p-5 hover:bg-neutral-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium mb-1 whitespace-nowrap">№ {o.number}</div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          ORDER_STATUS_DOT[o.status] ?? "bg-neutral-400"
                        }`}
                      />
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </span>
                    <span className="text-neutral-300">·</span>
                    <span className="whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-sm font-semibold">{formatPrice(o.totalTiyin)}</div>
                  <ArrowRight className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center justify-between gap-4 border border-neutral-200 rounded-2xl p-5 hover:border-neutral-900 hover:shadow-sm transition-all"
    >
      <div>
        <div className="text-[11px] uppercase tracking-widest text-neutral-500 mb-2">
          {label}
        </div>
        <div className="text-3xl font-medium tracking-tight">{value}</div>
      </div>
      <div className="h-11 w-11 rounded-full bg-neutral-100 grid place-items-center text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
        {icon}
      </div>
    </Link>
  );
}
