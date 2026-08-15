import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { listCategories, getFeaturedProducts } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";
import { HeroPromoCarousel } from "@/components/home/hero-promo-carousel";

export const revalidate = 300;

export default async function HomePage() {
  const [categories, bestSellers] = await Promise.all([
    listCategories().then((c) => c.slice(0, 4)),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative border-b overflow-hidden min-h-[calc(100vh-112px)] flex flex-col justify-center">
        <Image
          src="/hero-mobile.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom md:hidden"
        />
        <Image
          src="/hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center hidden md:block"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        <div className="relative mx-auto max-w-4xl px-4 md:px-8 pt-28 md:pt-40 text-center">
          <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-white/70 mb-4">
            — Новая коллекция
          </span>
          <h1 className="text-3xl md:text-5xl font-light leading-[1.1] tracking-tight mb-4 text-white">
            <span className="md:hidden">GA-DE у вас дома</span>
            <span className="hidden md:inline">Профессиональный уход GADE — теперь у вас дома</span>
          </h1>
          <p className="text-base text-white/80 mb-6 max-w-xl mx-auto leading-relaxed">
            Оригинальная косметика напрямую от бренда. Быстрая доставка по Ташкенту и в регионы, удобная оплата.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 bg-white text-neutral-900 px-7 py-3 text-sm hover:bg-neutral-100 transition-colors"
            >
              В каталог
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/catalog?sale=1"
              className="inline-flex items-center gap-2 border border-white text-white px-7 py-3 text-sm hover:bg-white hover:text-neutral-900 transition-colors"
            >
              Товары со скидкой
            </Link>
          </div>
        </div>

        {bestSellers.length > 0 && (
          <div className="relative mt-auto pt-16 pb-10 md:pb-14">
            <HeroPromoCarousel products={bestSellers} />
          </div>
        )}
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 md:px-8 py-12 md:py-16">
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight">Категории</h2>
            <Link
              href="/categories"
              className="text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              Все категории <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className="group relative aspect-square overflow-hidden bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <div className="absolute inset-0 flex items-end p-4">
                  <div>
                    <div className="text-base md:text-lg font-medium text-neutral-900 group-hover:text-neutral-700 transition-colors">
                      {c.name}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5 inline-flex items-center gap-1">
                      Смотреть <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
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
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight">Хиты продаж</h2>
            <Link
              href="/catalog?sort=popular"
              className="text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              Все хиты <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

    </>
  );
}
