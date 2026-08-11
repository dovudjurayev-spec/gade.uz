import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders, products } from "@/db/schema";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Обзор" };

async function getStats() {
  const [ordersToday] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.createdAt} >= now() - interval '24 hours'`);

  const [pending] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.status} in ('pending_payment','confirmed','paid')`);

  const [outOfStock] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(sql`${products.stock} = 0 and ${products.isVisible} = true`);

  return {
    ordersToday: ordersToday?.n ?? 0,
    pending: pending?.n ?? 0,
    outOfStock: outOfStock?.n ?? 0,
  };
}

export default async function AdminHome() {
  const stats = await getStats().catch(() => ({ ordersToday: 0, pending: 0, outOfStock: 0 }));

  return (
    <div>
      <h1 className="text-2xl mb-6">Обзор</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Заказов за 24 часа" value={stats.ordersToday} href="/admin/orders" />
        <Card title="Требуют внимания" value={stats.pending} href="/admin/orders?status=pending_payment" />
        <Card title="Закончились" value={stats.outOfStock} href="/admin/products?stock=0" />
      </div>
    </div>
  );
}

function Card({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Link href={href} className="block bg-white border p-6 hover:border-neutral-900">
      <div className="text-sm text-neutral-500 mb-2">{title}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </Link>
  );
}
