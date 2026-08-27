import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Heart, ArrowUpRight } from "lucide-react";
import { CartBadge } from "./cart-badge";
import { SearchOverlay } from "./search-overlay";
import { MobileMenu, type MobileSection } from "./mobile-menu";
import { listCategories, listCategoriesWithProducts } from "@/repositories/products";

type LeafItem = { href: string; label: string };
type SubItem = { href: string; label: string; children?: LeafItem[] };
type Section = { href: string; label: string; children?: SubItem[] };

export async function SiteHeader() {
  const [rootCats, allCats] = await Promise.all([
    listCategoriesWithProducts().catch(() => []),
    listCategories({ includeSubcategories: true }).catch(() => []),
  ]);
  const VIEW_ALL_BY_SLUG: Record<string, string> = {
    makiyazh: "Весь макияж",
    "uhod-za-litsom": "Весь уход за лицом",
    "uhod-za-telom": "Весь уход за телом",
    nogti: "Всё для ногтей",
    parfyumeriya: "Вся парфюмерия",
    aksessuary: "Все аксессуары",
  };
  const viewAllLabel = (slug: string, name: string) =>
    VIEW_ALL_BY_SLUG[slug] ?? `Все — ${name}`;
  const childrenByParent = new Map<number, { id: number; slug: string; name: string }[]>();
  for (const c of allCats) {
    if (c.parentId != null) {
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push({ id: c.id, slug: c.slug, name: c.name });
      childrenByParent.set(c.parentId, arr);
    }
  }
  const sections: Section[] = [
    { href: "/catalog?sort=popular", label: "Хиты продаж" },
    ...rootCats.map((c) => {
      const l2 = childrenByParent.get(c.id) ?? [];
      const l2Items: SubItem[] = l2.map((sub) => {
        const l3 = childrenByParent.get(sub.id) ?? [];
        return {
          href: `/catalog?category=${sub.slug}`,
          label: sub.name,
          children: l3.length
            ? l3.map((leaf) => ({ href: `/catalog?category=${leaf.slug}`, label: leaf.name }))
            : undefined,
        };
      });
      const children: SubItem[] | undefined = l2Items.length
        ? [{ href: `/catalog?category=${c.slug}`, label: viewAllLabel(c.slug, c.name) }, ...l2Items]
        : undefined;
      return { href: `/catalog?category=${c.slug}`, label: c.name, children };
    }),
  ];
  return (
    <header className="sticky top-0 z-40 w-full bg-white">
      {/* Announcement */}
      <div className="bg-neutral-900 text-[11px] text-white">
        <div className="mx-auto flex h-7 max-w-7xl items-center justify-center px-4 md:px-8 tracking-wide">
          Бесплатная доставка по Ташкенту от 500 000 сум
        </div>
      </div>

      {/* Main row */}
      <div className="border-b border-neutral-100">
        <div className="mx-auto grid h-12 max-w-7xl grid-cols-3 items-center px-4 md:px-8">
          <div className="flex items-center gap-1 -ml-2">
            <MobileMenu sections={sections as MobileSection[]} />
            <SearchOverlay />
          </div>

          <div className="flex justify-center">
            <Link href="/" aria-label="GADE — на главную" className="flex items-center">
              <Image
                src="/logo.png"
                alt="GA-DE"
                width={144}
                height={40}
                priority
                className="h-4 md:h-5 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-4">
            <Link
              aria-label="Избранное"
              href="/account/favorites"
              className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>

            <Link
              aria-label="Личный кабинет"
              href="/account"
              className="p-2 text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>

            <Link
              aria-label="Корзина"
              href="/cart"
              className="relative p-2 -mr-2 text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
              <CartBadge />
            </Link>
          </div>
        </div>
      </div>

      {/* Sections nav */}
      <nav className="hidden md:block border-b border-neutral-100">
        <ul className="mx-auto flex max-w-7xl items-center justify-center gap-8 lg:gap-12 px-4 md:px-8 h-10 text-[13px] font-normal">
          {sections.map((s) => {
            const hasChildren = !!s.children && s.children.length > 0;
            const [viewAll, ...subs] = s.children ?? [];
            return (
              <li key={s.href} className="group relative">
                <Link
                  href={s.href}
                  className="relative inline-flex items-center text-neutral-800 transition-colors"
                >
                  <span className="pb-0.5 transition-colors group-hover:text-neutral-900">
                    {s.label}
                  </span>
                  <span
                    className={`pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-neutral-900 transition-transform duration-300 group-hover:scale-x-100`}
                  />
                </Link>
                {hasChildren && (
                  <div className="invisible translate-y-1 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 absolute left-1/2 top-full -translate-x-1/2 pt-3 z-50">
                    <div className="relative min-w-[300px] bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] ring-1 ring-neutral-100">
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 bg-white ring-1 ring-neutral-100" />
                      <div className="relative bg-white">
                        <div className="px-5 pt-5 pb-3">
                          <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
                            Разделы
                          </div>
                          <div className="mt-1 text-lg font-light tracking-tight text-neutral-900">
                            {s.label}
                          </div>
                        </div>
                        <div className="mx-5 h-px bg-neutral-100" />
                        <ul className="py-2">
                          {subs.map((c) => {
                            const hasLeaves = !!c.children && c.children.length > 0;
                            return (
                              <li key={c.href} className="group/sub relative">
                                <Link
                                  href={c.href}
                                  className="group/item flex items-center justify-between gap-6 px-5 py-2.5 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                                >
                                  <span className="inline-flex items-center gap-2.5">
                                    <span className="h-px w-3 bg-neutral-300 transition-all duration-200 group-hover/item:w-6 group-hover/item:bg-neutral-900" />
                                    {c.label}
                                  </span>
                                  <ArrowUpRight
                                    className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0"
                                    strokeWidth={1.5}
                                  />
                                </Link>
                                {hasLeaves && (
                                  <div className="invisible opacity-0 translate-x-1 group-hover/sub:visible group-hover/sub:opacity-100 group-hover/sub:translate-x-0 transition-all duration-200 absolute left-full top-0 pl-2 z-50">
                                    <div className="min-w-[240px] bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] ring-1 ring-neutral-100">
                                      <div className="px-5 pt-4 pb-2">
                                        <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
                                          {c.label}
                                        </div>
                                      </div>
                                      <div className="mx-5 h-px bg-neutral-100" />
                                      <ul className="py-2">
                                        {c.children!.map((leaf) => (
                                          <li key={leaf.href}>
                                            <Link
                                              href={leaf.href}
                                              className="group/leaf flex items-center justify-between gap-6 px-5 py-2 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                                            >
                                              <span className="inline-flex items-center gap-2.5">
                                                <span className="h-px w-2 bg-neutral-300 transition-all duration-200 group-hover/leaf:w-5 group-hover/leaf:bg-neutral-900" />
                                                {leaf.label}
                                              </span>
                                              <ArrowUpRight
                                                className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover/leaf:opacity-100 group-hover/leaf:translate-x-0"
                                                strokeWidth={1.5}
                                              />
                                            </Link>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {viewAll && (
                          <>
                            <div className="mx-5 h-px bg-neutral-100" />
                            <Link
                              href={viewAll.href}
                              className="flex items-center justify-between px-5 py-3.5 text-[11px] uppercase tracking-[0.2em] text-neutral-900 hover:bg-neutral-900 hover:text-white transition-colors"
                            >
                              {viewAll.label}
                              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
