import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { favorites, products } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/money";
import { removeFavoriteAction } from "./actions";

export default async function FavoritesPage() {
  const customer = (await getCurrentCustomer())!;
  const favRows = await db.query.favorites.findMany({
    where: eq(favorites.customerId, customer.id),
    orderBy: [desc(favorites.createdAt)],
  });

  const productList = favRows.length
    ? await db.query.products.findMany({ where: inArray(products.id, favRows.map((f) => f.productId)) })
    : [];
  const byId = new Map(productList.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-sans">Избранное</h1>
      {favRows.length === 0 ? (
        <p className="text-sm text-neutral-500">Пока пусто. <Link href="/catalog" className="underline">В каталог</Link></p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {favRows.map((f) => {
            const p = byId.get(f.productId);
            if (!p) return null;
            return (
              <div key={f.id} className="border p-4 flex items-start justify-between gap-4">
                <div className="text-sm">
                  <Link href={`/catalog/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
                  <div className="text-neutral-600 mt-1">{formatPrice(p.priceTiyin)}</div>
                </div>
                <form action={removeFavoriteAction.bind(null, p.id)}>
                  <button className="text-xs text-red-600 hover:underline">Удалить</button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
