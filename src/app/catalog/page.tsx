import { listProducts, listCategories } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";
import Link from "next/link";
import { Check, TrendingUp, ArrowDownUp, X, Package, Percent, Zap } from "lucide-react";

export const revalidate = 300; // 5 min ISR

type Sort = "popular" | "new" | "price_asc" | "price_desc";

type SearchParams = Promise<{
  category?: string;
  line?: string;
  sort?: Sort;
  stock?: string;
  sale?: string;
  q?: string;
}>;

function buildHref(
  sp: { category?: string; sort?: Sort; stock?: string; sale?: string; q?: string },
  patch: Partial<{ category?: string | null; sort?: Sort | null; stock?: boolean; sale?: boolean }>,
) {
  const params = new URLSearchParams();
  const category = patch.category === undefined ? sp.category : patch.category ?? undefined;
  const sort = patch.sort === undefined ? sp.sort : patch.sort ?? undefined;
  const stock = patch.stock === undefined ? sp.stock === "1" : patch.stock;
  const sale = patch.sale === undefined ? sp.sale === "1" : patch.sale;

  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  if (stock) params.set("stock", "1");
  if (sale) params.set("sale", "1");
  if (sp.q) params.set("q", sp.q);
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [products, cats] = await Promise.all([
    listProducts({
      categorySlug: sp.category,
      brandLineSlug: sp.line,
      sort: sp.sort,
      inStock: sp.stock === "1",
      onSale: sp.sale === "1",
      q: sp.q,
    }),
    listCategories(),
  ]);

  const activeSort: Sort = sp.sort ?? "popular";
  const activeCategory = sp.category ?? "";
  const stockOn = sp.stock === "1";
  const saleOn = sp.sale === "1";
  const hasActiveFilters = activeCategory || stockOn || saleOn || sp.sort;

  const sortLabels: Record<Sort, { label: string; icon: typeof Zap }> = {
    popular: { label: "Популярные", icon: TrendingUp },
    new: { label: "Новинки", icon: Zap },
    price_asc: { label: "Цена ↑", icon: ArrowDownUp },
    price_desc: { label: "Цена ↓", icon: ArrowDownUp },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            {sp.q ? "Результаты поиска" : "Магазин"}
          </span>
          <h1 className="mt-2 text-3xl md:text-5xl font-light tracking-tight">
            {sp.q ? `«${sp.q}»` : "Каталог"}
          </h1>
        </div>
        <div className="text-sm text-neutral-500">
          {products.length}{" "}
          {products.length === 1 ? "товар" : products.length < 5 && products.length !== 0 ? "товара" : "товаров"}
        </div>
      </div>

      {/* Categories — horizontal pill scroller */}
      <div className="-mx-4 md:mx-0 mb-6">
        <div className="flex gap-2 overflow-x-auto px-4 md:px-0 pb-2 no-scrollbar">
          <CategoryChip
            href={buildHref(sp, { category: null })}
            active={!activeCategory}
            label="Все"
          />
          {cats.map((c) => (
            <CategoryChip
              key={c.id}
              href={buildHref(sp, { category: c.slug })}
              active={activeCategory === c.slug}
              label={c.name}
            />
          ))}
        </div>
      </div>

      {/* Toolbar: filter toggles + sort */}
      <div className="mb-8 pb-6 border-b border-neutral-200 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-3">
        <div className="-mx-4 md:mx-0">
          <div className="flex items-center gap-2 overflow-x-auto px-4 md:px-0 no-scrollbar">
            <ToggleChip
              href={buildHref(sp, { stock: !stockOn })}
              active={stockOn}
              icon={Package}
              label="В наличии"
            />
            <ToggleChip
              href={buildHref(sp, { sale: !saleOn })}
              active={saleOn}
              icon={Percent}
              label="Со скидкой"
            />
            {hasActiveFilters && (
              <Link
                href="/catalog"
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                Сбросить
              </Link>
            )}
          </div>
        </div>

        <div className="-mx-4 md:mx-0">
          <div className="flex items-center gap-1 overflow-x-auto px-4 md:px-0 no-scrollbar">
            {(Object.keys(sortLabels) as Sort[]).map((key) => {
              const { label, icon: Icon } = sortLabels[key];
              const active = activeSort === key;
              return (
                <Link
                  key={key}
                  href={buildHref(sp, { sort: key })}
                  className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 text-xs whitespace-nowrap transition-colors ${
                    active
                      ? "text-neutral-900 font-medium"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="border border-dashed border-neutral-300 py-24 text-center">
          <div className="text-sm text-neutral-500 mb-4">По этим фильтрам ничего не найдено.</div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-900 hover:text-brand-accent transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
            Сбросить фильтры
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-4 text-sm rounded-full border transition-colors whitespace-nowrap ${
        active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900"
      }`}
    >
      {active && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
      {label}
    </Link>
  );
}

function ToggleChip({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: typeof Zap;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 h-9 px-3 text-xs uppercase tracking-widest border transition-colors ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 text-neutral-700 hover:border-neutral-900"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {label}
      {active && <X className="h-3 w-3 ml-0.5" strokeWidth={2} />}
    </Link>
  );
}
