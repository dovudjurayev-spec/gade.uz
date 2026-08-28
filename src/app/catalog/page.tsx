import { listProducts, listCategories, countProducts } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";
import { Reveal } from "@/components/ui/reveal";
import Link from "next/link";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

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
  const catById = new Map(allCats.map((c) => [c.id, c] as const));
  const activeCat = sp.category ? allCats.find((c) => c.slug === sp.category) ?? null : null;
  // Определяем уровень активной категории и её предков.
  let activeRootId: number | null = null;
  let activeL2Id: number | null = null;
  let activeL3Id: number | null = null;
  if (activeCat) {
    if (activeCat.parentId == null) {
      activeRootId = activeCat.id;
    } else {
      const parent = catById.get(activeCat.parentId) ?? null;
      if (parent?.parentId == null) {
        activeRootId = parent?.id ?? null;
        activeL2Id = activeCat.id;
      } else {
        const grand = catById.get(parent.parentId) ?? null;
        activeRootId = grand?.id ?? null;
        activeL2Id = parent.id;
        activeL3Id = activeCat.id;
      }
    }
  }
  const l2Cats = activeRootId ? allCats.filter((c) => c.parentId === activeRootId) : [];
  const l3Cats = activeL2Id ? allCats.filter((c) => c.parentId === activeL2Id) : [];
  const subCats = l2Cats;
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

      {/* Categories — horizontal pill scroller (L1 → L2 → L3) */}
      <div className="-mx-4 md:mx-0 mb-6 space-y-2">
        <ChipScroller>
          <CategoryChip
            href={buildHref(sp, { category: null })}
            active={!activeCategory}
            label="Все"
          />
          {cats.map((c) => (
            <CategoryChip
              key={c.id}
              href={buildHref(sp, { category: c.slug })}
              active={activeRootId === c.id}
              label={c.name}
            />
          ))}
        </ChipScroller>
        {l2Cats.length > 0 && (
          <ChipScroller>
            {(() => {
              const rootCat = activeRootId ? catById.get(activeRootId) : null;
              return rootCat ? (
                <CategoryChip
                  href={buildHref(sp, { category: rootCat.slug })}
                  active={activeCategory === rootCat.slug}
                  label={`Весь ${rootCat.name.toLowerCase()}`}
                  size="sm"
                />
              ) : null;
            })()}
            {l2Cats.map((c) => (
              <CategoryChip
                key={c.id}
                href={buildHref(sp, { category: c.slug })}
                active={activeL2Id === c.id}
                label={c.name}
                size="sm"
              />
            ))}
          </ChipScroller>
        )}
        {l3Cats.length > 0 && (
          <ChipScroller>
            {l3Cats.map((c) => (
              <CategoryChip
                key={c.id}
                href={buildHref(sp, { category: c.slug })}
                active={activeL3Id === c.id}
                label={c.name}
                size="sm"
                muted
              />
            ))}
          </ChipScroller>
        )}
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
              // Внутри выбранной ветки строим иерархическое представление:
              // L1 → L2 → L3. Заголовки уровней вставляем в общую сетку через col-span-full,
              // чтобы карточки текли непрерывно.
              const hasHierarchy =
                activeCat &&
                activeSort === "popular" &&
                (l2Cats.length > 0 || l3Cats.length > 0);
              if (hasHierarchy) {
                // Для каждого товара определяем его L2 и L3 в рамках активного корня.
                type L3Bucket = {
                  id: number | null;
                  name: string;
                  products: (typeof products)[number][];
                };
                type L2Bucket = {
                  id: number | null;
                  sortOrder: number;
                  name: string;
                  l3s: L3Bucket[];
                };
                const l2Map = new Map<number | null, L2Bucket>();
                const l2SortOrder = (id: number | null) =>
                  id == null ? 9999 : allCats.findIndex((c) => c.id === id);

                for (const p of products) {
                  const leaf = p.categoryId ? catById.get(p.categoryId) ?? null : null;
                  let l2: typeof leaf = null;
                  let l3: typeof leaf = null;
                  if (leaf) {
                    if (leaf.parentId === activeRootId) {
                      l2 = leaf;
                    } else if (leaf.parentId != null) {
                      const parent = catById.get(leaf.parentId) ?? null;
                      if (parent && parent.parentId === activeRootId) {
                        l2 = parent;
                        l3 = leaf;
                      } else if (leaf.id === activeRootId) {
                        // Товар прямо на корне — оставляем в "misc".
                      }
                    }
                  }
                  const l2Key = l2?.id ?? null;
                  let l2Bucket = l2Map.get(l2Key);
                  if (!l2Bucket) {
                    l2Bucket = {
                      id: l2Key,
                      sortOrder: l2SortOrder(l2Key),
                      name: l2?.name ?? "Прочее",
                      l3s: [],
                    };
                    l2Map.set(l2Key, l2Bucket);
                  }
                  const l3Key = l3?.id ?? null;
                  let l3Bucket = l2Bucket.l3s.find((b) => b.id === l3Key);
                  if (!l3Bucket) {
                    l3Bucket = { id: l3Key, name: l3?.name ?? l2Bucket.name, products: [] };
                    l2Bucket.l3s.push(l3Bucket);
                  }
                  l3Bucket.products.push(p);
                }

                const orderedL2 = [...l2Map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
                const isL2Selected = activeCat!.parentId != null;

                type Cell =
                  | { kind: "l2"; key: string; label: string }
                  | { kind: "l3"; key: string; label: string }
                  | { kind: "card"; key: string; product: (typeof products)[number] };
                const cells: Cell[] = [];
                for (const l2 of orderedL2) {
                  // Заголовок L2 показываем только если выбран корень (иначе — избыточно).
                  if (!isL2Selected && orderedL2.length > 1) {
                    cells.push({ kind: "l2", key: `l2-${l2.id ?? "misc"}`, label: l2.name });
                  }
                  const hasL3Headers = l2.l3s.some((b) => b.id != null);
                  for (const l3 of l2.l3s) {
                    if (hasL3Headers && l3.id != null) {
                      cells.push({ kind: "l3", key: `l3-${l3.id}`, label: l3.name });
                    }
                    for (const p of l3.products) {
                      cells.push({ kind: "card", key: `p-${p.id}`, product: p });
                    }
                  }
                }
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {cells.map((c, idx) =>
                      c.kind === "l2" ? (
                        <h2
                          key={c.key}
                          className="col-span-full text-lg md:text-xl font-light tracking-tight text-neutral-900 mt-8 first:mt-0"
                        >
                          {c.label}
                        </h2>
                      ) : c.kind === "l3" ? (
                        <h3
                          key={c.key}
                          className="col-span-full text-[11px] uppercase tracking-[0.25em] text-neutral-500 mt-4 first:mt-0"
                        >
                          {c.label}
                        </h3>
                      ) : (
                        <Reveal key={c.key} delay={(idx % 4) * 60}>
                          <ProductCard product={c.product} />
                        </Reveal>
                      ),
                    )}
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 60}>
                      <ProductCard product={p} />
                    </Reveal>
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
                                {s.items.map((p, k) => (
                                  <Reveal key={p.id} delay={(k % 4) * 60}>
                                    <ProductCard product={p} />
                                  </Reveal>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {g.items.map((p, k) => (
                            <Reveal key={p.id} delay={(k % 4) * 60}>
                              <ProductCard product={p} />
                            </Reveal>
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

function ChipScroller({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto px-4 md:px-0 pb-2 no-scrollbar snap-x snap-mandatory md:snap-none [&>*]:snap-start">
        {children}
      </div>
      {/* Fade-подсказки о скролле — только на мобильных */}
      <div
        aria-hidden
        className="md:hidden pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent"
      />
      <div
        aria-hidden
        className="md:hidden pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent"
      />
    </div>
  );
}

function CategoryChip({
  href,
  active,
  label,
  size = "md",
  muted = false,
}: {
  href: string;
  active: boolean;
  label: string;
  size?: "md" | "sm";
  muted?: boolean;
}) {
  const sizing = size === "sm" ? "h-7 px-3 text-[12px]" : "h-9 px-4 text-sm";
  const inactive = muted
    ? "bg-transparent text-neutral-500 border-neutral-200 hover:text-neutral-900 hover:border-neutral-400"
    : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900";
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border transition-colors whitespace-nowrap ${sizing} ${
        active ? "bg-neutral-900 text-white border-neutral-900" : inactive
      }`}
    >
      {active && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
      {label}
    </Link>
  );
}

