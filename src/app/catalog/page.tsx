import { listProducts, listCategories, countProducts } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";
import Link from "next/link";
import { Check, X } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

type Sort = "popular" | "new" | "price_asc" | "price_desc";

type SearchParams = Promise<{
  category?: string;
  line?: string;
  sort?: Sort;
  stock?: string;
  sale?: string;
  q?: string;
  page?: string;
}>;

function buildHref(
  sp: { category?: string; sort?: Sort; stock?: string; sale?: string; q?: string; page?: string },
  patch: Partial<{ category?: string | null; sort?: Sort | null; stock?: boolean; sale?: boolean; page?: number | null }>,
) {
  const params = new URLSearchParams();
  const category = patch.category === undefined ? sp.category : patch.category ?? undefined;
  const sort = patch.sort === undefined ? sp.sort : patch.sort ?? undefined;
  const stock = patch.stock === undefined ? sp.stock === "1" : patch.stock;
  const sale = patch.sale === undefined ? sp.sale === "1" : patch.sale;
  const resetsPage = "category" in patch || "sort" in patch || "stock" in patch || "sale" in patch;
  const page = patch.page !== undefined
    ? (patch.page == null ? undefined : String(patch.page))
    : resetsPage
    ? undefined
    : sp.page;

  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  if (stock) params.set("stock", "1");
  if (sale) params.set("sale", "1");
  if (sp.q) params.set("q", sp.q);
  if (page && page !== "1") params.set("page", page);
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page) || 1);
  const filters = {
    categorySlug: sp.category,
    brandLineSlug: sp.line,
    sort: sp.sort,
    inStock: sp.stock === "1",
    onSale: sp.sale === "1",
    q: sp.q,
  };
  // Кумулятивная загрузка: страница N показывает первые N * PAGE_SIZE товаров.
  // Так «Показать ещё» = /catalog?page=N+1 и добавляет ровно PAGE_SIZE новых карточек,
  // сохраняя все ранее показанные.
  const [products, allCats, total] = await Promise.all([
    listProducts({ ...filters, limit: PAGE_SIZE * pageNum, offset: 0 }),
    listCategories({ includeSubcategories: true }),
    countProducts(filters),
  ]);
  const rootCats = allCats.filter((c) => c.parentId == null);
  const activeCat = sp.category ? allCats.find((c) => c.slug === sp.category) ?? null : null;
  const activeRootId = activeCat?.parentId ?? activeCat?.id ?? null;
  const subCats = activeRootId ? allCats.filter((c) => c.parentId === activeRootId) : [];
  const cats = rootCats;
  const hasMore = products.length < total;
  const remaining = Math.max(0, total - products.length);

  const activeSort: Sort = sp.sort ?? "popular";
  const activeCategory = sp.category ?? "";
  const stockOn = sp.stock === "1";
  const saleOn = sp.sale === "1";
  const hasActiveFilters = activeCategory || stockOn || saleOn || sp.sort;

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
          {total}{" "}
          {total % 10 === 1 && total % 100 !== 11
            ? "товар"
            : [2, 3, 4].includes(total % 10) && ![12, 13, 14].includes(total % 100)
            ? "товара"
            : "товаров"}
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
              active={activeCategory === c.slug || activeCat?.parentId === c.id}
              label={c.name}
            />
          ))}
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
        <>
          {(() => {
            const groupByCategory =
              (activeSort === "popular") && !activeCategory && !sp.q;
            if (!groupByCategory) {
              // Внутри выбранной корневой категории показываем подзаголовки подкатегорий,
              // но встраиваем их в ту же сетку через col-span-full — ряды карточек текут
              // непрерывно, последний ряд заполняется до конца.
              const isRootWithSubs =
                activeCat && activeCat.parentId == null && subCats.length > 0;
              if (isRootWithSubs && activeSort === "popular") {
                type Cell = { kind: "header"; key: string; label: string } | { kind: "card"; key: string; product: (typeof products)[number] };
                const cells: Cell[] = [];
                let currentSlug: string | null | undefined = undefined;
                for (const p of products) {
                  const leafName = p.leafCategoryName ?? activeCat!.name;
                  const leafSlug = p.leafCategorySlug ?? activeCat!.slug;
                  if (leafSlug !== currentSlug) {
                    currentSlug = leafSlug;
                    cells.push({ kind: "header", key: `h-${leafSlug ?? "misc"}-${cells.length}`, label: leafName });
                  }
                  cells.push({ kind: "card", key: `p-${p.id}`, product: p });
                }
                if (cells.some((c) => c.kind === "header")) {
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {cells.map((c) =>
                        c.kind === "header" ? (
                          <h3
                            key={c.key}
                            className="col-span-full text-sm uppercase tracking-widest text-neutral-600 mt-6 first:mt-0"
                          >
                            {c.label}
                          </h3>
                        ) : (
                          <ProductCard key={c.key} product={c.product} />
                        ),
                      )}
                    </div>
                  );
                }
              }
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              );
            }
            const groups: { name: string; slug: string | null; items: typeof products }[] = [];
            for (const p of products) {
              const name = p.categoryName ?? "Прочее";
              const slug = p.categorySlug ?? null;
              const existing = groups.find((g) => (g.slug ?? "") === (slug ?? ""));
              if (existing) existing.items.push(p);
              else groups.push({ name, slug, items: [p] });
            }
            return (
              <div className="space-y-10">
                {groups.map((g, i) => {
                  // Разбиваем на подгруппы по leafCategoryName (внутренний порядок сохраняется из orderBy)
                  const sub: { name: string; slug: string | null; items: typeof g.items }[] = [];
                  for (const p of g.items) {
                    const leafName = p.leafCategoryName ?? g.name;
                    const leafSlug = p.leafCategorySlug ?? g.slug;
                    const existing = sub.find((s) => s.slug === leafSlug);
                    if (existing) existing.items.push(p);
                    else sub.push({ name: leafName, slug: leafSlug, items: [p] });
                  }
                  while (sub.length > 1 && sub[sub.length - 1]!.items.length < 4) {
                    const tail = sub.pop()!;
                    sub[sub.length - 1]!.items.push(...tail.items);
                  }
                  const hasSubs = sub.length > 1 || (sub.length === 1 && sub[0]!.slug !== g.slug);
                  return (
                    <section key={`${g.slug ?? "misc"}-${i}`}>
                      <div className="mb-4">
                        <h2 className="text-xl md:text-2xl font-light tracking-tight">{g.name}</h2>
                      </div>
                      {hasSubs ? (
                        <div className="space-y-8">
                          {sub.map((s, j) => (
                            <div key={`${s.slug ?? "misc"}-${j}`}>
                              <div className="mb-3">
                                <h3 className="text-sm uppercase tracking-widest text-neutral-600">{s.name}</h3>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {s.items.map((p) => (
                                  <ProductCard key={p.id} product={p} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {g.items.map((p) => (
                            <ProductCard key={p.id} product={p} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            );
          })()}
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <Link
                href={buildHref(sp, { page: pageNum + 1 })}
                className="inline-flex items-center gap-2 h-11 px-6 text-xs uppercase tracking-widest border border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                scroll={false}
              >
                Показать ещё
                <span className="text-neutral-500 group-hover:text-neutral-300 normal-case tracking-normal">
                  ({Math.min(PAGE_SIZE, remaining)} из {remaining})
                </span>
              </Link>
            </div>
          )}
        </>
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

