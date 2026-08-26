import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listCategories, getFeaturedProducts, listProducts } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, bestSellers, vanilla] = await Promise.all([
    listCategories().then((c) => c.slice(0, 4)),
    getFeaturedProducts(8),
    listProducts({ brandLineSlug: "vanilla", limit: 4 }),
  ]);

  return (
    <>
      {/* Hero — mobile: stacked; desktop: split side-by-side */}
      <section className="border-b border-neutral-100 bg-white md:grid md:grid-cols-2 md:min-h-[calc(100vh-112px)]">
        {/* Content */}
        <div className="flex flex-col justify-center px-4 md:pr-8 lg:pr-12 pt-12 md:py-16 pb-10 md:order-1 md:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-5 block">
            Новая коллекция · Скидка до 30%
          </span>
          <h1 className="text-4xl md:text-6xl font-light leading-[1.05] tracking-tight text-neutral-900 mb-6">
            Vanilla — тёплая линейка
          </h1>
          <p className="text-base md:text-lg text-neutral-600 mb-8 max-w-md leading-relaxed">
            Мисты, кремы и парфюм — единая линейка с тёплым шлейфом ванили. Ритуал ухода, объединённый одним ароматом. Знакомство со скидкой до 30%.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="group inline-flex items-center gap-2 bg-neutral-900 text-white px-7 py-3.5 text-sm hover:bg-neutral-700 transition-colors"
            >
              В каталог
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
            <Link
              href="/catalog?sale=1"
              className="inline-flex items-center gap-2 border border-neutral-900 text-neutral-900 px-7 py-3.5 text-sm hover:bg-neutral-900 hover:text-white transition-colors"
            >
              Товары со скидкой
            </Link>
          </div>
        </div>

        {/* Animation — mobile below text, desktop right */}
        <div className="relative w-full h-[52vh] md:h-auto md:min-h-0 md:order-2 overflow-hidden bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-animation.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top md:object-right"
          />
        </div>
      </section>


      {/* Vanilla line */}
      {vanilla.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 md:px-8 py-12 md:py-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                <span className="h-px w-6 bg-neutral-400" />
                Линейка
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-medium tracking-tight">Vanilla</h2>
              <p className="mt-2 text-sm text-neutral-600 max-w-lg">
                Тёплый шлейф ванили в ежедневном ритуале ухода — мисты, кремы, парфюм.
              </p>
            </div>
            <Link
              href="/catalog?brand=vanilla"
              className="group text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 transition-colors"
            >
              Вся линейка <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vanilla.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 md:px-8 py-12 md:py-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                <span className="h-px w-6 bg-neutral-400" />
                Выберите свою
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-medium tracking-tight">Категории</h2>
            </div>
            <Link
              href="/categories"
              className="group text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 transition-colors"
            >
              Все категории <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className="group relative aspect-square overflow-hidden bg-neutral-100 transition-colors"
              >
                <div className="absolute inset-0 bg-neutral-200 opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="absolute inset-0 flex items-end p-4">
                  <div className="relative">
                    <div className="text-base md:text-lg font-medium text-neutral-900 transition-colors">
                      {c.name}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5 inline-flex items-center gap-1 group-hover:text-neutral-900 transition-colors">
                      Смотреть <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 md:px-8 pb-12 md:pb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
                <span className="h-px w-6 bg-neutral-400" />
                Любимое покупателями
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-medium tracking-tight">Хиты продаж</h2>
            </div>
            <Link
              href="/catalog?sort=popular"
              className="group text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 transition-colors"
            >
              Все хиты <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Brand storytelling */}
      <section className="border-t border-neutral-100 bg-neutral-50/50">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            <span className="h-px w-6 bg-neutral-400" />
            О бренде
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-light tracking-tight text-neutral-900 leading-tight">
            Профессиональная косметика<br />GA-DE
          </h2>
          <p className="mt-5 text-base md:text-lg text-neutral-600 leading-relaxed">
            GA-DE — израильский бренд с более чем 30-летней историей. Формулы разрабатываются в собственной лаборатории в Тель-Авиве и производятся на европейских фабриках.
          </p>
          <p className="mt-4 text-base text-neutral-600 leading-relaxed">
            На gade.uz — официальная дистрибуция в Узбекистане: только оригинальная продукция, актуальные партии и полный ассортимент декоративной косметики, ухода и ароматов.
          </p>
          <Link
            href="/about"
            className="group mt-8 inline-flex items-center gap-2 text-sm text-neutral-900 hover:text-neutral-600 transition-colors border-b border-neutral-900 hover:border-neutral-600 pb-0.5 w-fit"
          >
            Больше о бренде
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
          </Link>
          </div>
        </div>
      </section>

    </>
  );
}
