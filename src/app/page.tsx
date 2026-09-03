import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { listCategories, getFeaturedProducts, listProducts } from "@/repositories/products";
import { ProductCard } from "@/components/catalog/product-card";

const CATEGORY_TILE_IMAGES: Record<string, string> = {
  makiyazh: "/categories/makiyazh.png",
  "uhod-za-litsom": "/categories/uhod-za-litsom.png",
  "uhod-za-telom": "/categories/uhod-za-telom.png",
  nogti: "/categories/nogti.png",
  parfyumeriya: "/categories/parfyumeriya.png",
  aksessuary: "/categories/aksessuary.png",
};

const CATEGORY_TILE_BG_DEFAULT = "bg-white";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, bestSellers, vanilla] = await Promise.all([
    listCategories(),
    getFeaturedProducts(8),
    listProducts({ brandLineSlug: "vanilla", limit: 4 }),
  ]);

  return (
    <>
      {/* Hero — banner image with CTA */}
      <section className="border-b border-neutral-100 bg-white">
        <div className="relative w-full">
          <Image
            src="/hero-banner-mobile.jpg"
            alt="GA-DE — Feel the Beauty"
            width={900}
            height={1200}
            priority
            sizes="100vw"
            className="w-full h-auto object-contain md:hidden"
          />
          <Image
            src="/hero-banner.jpg"
            alt="GA-DE — Feel the Beauty"
            width={1920}
            height={600}
            priority
            sizes="100vw"
            className="hidden md:block w-full h-auto object-contain"
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {categories.map((c) => {
              const img = CATEGORY_TILE_IMAGES[c.slug];
              return (
                <Link
                  key={c.id}
                  href={`/catalog?category=${c.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-white ring-1 ring-neutral-200/70">
                    {img && (
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-contain object-center p-1 md:p-8 transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="text-sm md:text-base font-medium text-neutral-900 group-hover:text-neutral-600 transition-colors">
                      {c.name}
                    </div>
                    <ArrowRight
                      className="ml-auto h-4 w-4 text-neutral-400 transition-all group-hover:text-neutral-900 group-hover:translate-x-1"
                      strokeWidth={1.5}
                    />
                  </div>
                </Link>
              );
            })}
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
