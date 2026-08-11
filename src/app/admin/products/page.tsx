import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Товары · Админка" };

type SP = Promise<{ stock?: string; q?: string }>;

export default async function ProductsAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  let query = db.select().from(products).orderBy(asc(products.name)).$dynamic();
  const conditions = [];
  if (sp.stock === "0") conditions.push(sql`${products.stock} = 0`);
  if (sp.q) conditions.push(sql`(${products.name} ilike ${"%" + sp.q + "%"} or ${products.sku} ilike ${"%" + sp.q + "%"})`);
  if (conditions.length) query = query.where(sql`${sql.join(conditions, sql` and `)}`);
  const rows = await query.limit(500);

  return (
    <div>
      <h1 className="text-2xl mb-6">Товары</h1>

      <form className="flex gap-2 mb-6" method="get">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Название или SKU" className="border h-10 px-3 text-sm" />
        <button className="bg-brand text-white h-10 px-4 text-sm">Найти</button>
        <Link href="/admin/products?stock=0" className="self-center text-sm underline">Закончились</Link>
        <Link href="/admin/products" className="self-center text-sm underline">Все</Link>
      </form>

      <div className="bg-white border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Название</th>
              <th className="px-3 py-2 text-right">Цена</th>
              <th className="px-3 py-2 text-right">Остаток</th>
              <th className="px-3 py-2">Флаги</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 text-neutral-500">{p.sku}</td>
                <td className="px-3 py-2">{p.name} {p.volume && <span className="text-neutral-500">· {p.volume}</span>}</td>
                <td className="px-3 py-2 text-right">{formatPrice(p.priceTiyin)}</td>
                <td className={`px-3 py-2 text-right ${p.stock === 0 ? "text-red-600" : ""}`}>{p.stock}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">
                  {p.isFeatured && "хит "} {p.isNew && "новинка "} {!p.isVisible && "скрыт"}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/products/${p.id}`} className="text-blue-700 hover:underline">Редактировать</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
