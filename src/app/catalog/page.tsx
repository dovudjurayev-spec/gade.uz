import { listProducts, listCategories } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";
import Link from "next/link";

export const revalidate = 300; // 5 min ISR

type SearchParams = Promise<{
  category?: string;
  line?: string;
  sort?: "popular" | "new" | "price_asc" | "price_desc";
  stock?: string;
  sale?: string;
}>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [products, cats] = await Promise.all([
    listProducts({
      categorySlug: sp.category,
      brandLineSlug: sp.line,
      sort: sp.sort,
      inStock: sp.stock === "1",
      onSale: sp.sale === "1",
    }),
    listCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
      <h1 className="text-2xl md:text-3xl mb-6">Каталог</h1>

      <div className="grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="space-y-6 text-sm">
          <div>
            <div className="font-medium mb-2">Категории</div>
            <ul className="space-y-1">
              <li>
                <Link href="/catalog" className="hover:text-brand-accent">Все</Link>
              </li>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalog?category=${c.slug}`}
                    className="hover:text-brand-accent"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-medium mb-2">Фильтры</div>
            <ul className="space-y-1">
              <li><Link href="/catalog?stock=1">В наличии</Link></li>
              <li><Link href="/catalog?sale=1">Со скидкой</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-medium mb-2">Сортировка</div>
            <ul className="space-y-1">
              <li><Link href="/catalog?sort=popular">Популярные</Link></li>
              <li><Link href="/catalog?sort=new">Новинки</Link></li>
              <li><Link href="/catalog?sort=price_asc">Цена ↑</Link></li>
              <li><Link href="/catalog?sort=price_desc">Цена ↓</Link></li>
            </ul>
          </div>
        </aside>

        <div>
          {products.length === 0 ? (
            <div className="text-neutral-500 py-16 text-center">
              По этим фильтрам ничего не найдено.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
