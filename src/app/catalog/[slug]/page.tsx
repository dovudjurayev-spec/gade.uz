import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, ChevronRight } from "lucide-react";
import { getProductBySlug, listProducts } from "@/repositories/products";
import { formatPrice } from "@/lib/money";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductCard } from "@/components/catalog/product-card";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const CATEGORY_HIGHLIGHTS: Record<string, string[]> = {
  nogti: ["Насыщенный, стойкий цвет", "Быстрое высыхание", "Ровное покрытие без разводов"],
  makiyazh: ["Комфортная текстура на весь день", "Насыщенная пигментация", "Дерматологически протестировано"],
  "uhod-za-litsom": ["Мягкий уход без стягивания", "Подходит для ежедневного применения", "Дерматологически протестировано"],
  "uhod-za-telom": ["Питает и увлажняет кожу", "Приятный аромат без отдушек-раздражителей", "Не оставляет липкого ощущения"],
  parfyumeriya: ["Стойкий шлейф", "Раскрытие в 3 нотных аккордах", "Универсально для дня и вечера"],
  aksessuary: ["Продуманная эргономика", "Долговечные материалы", "Профессиональное качество"],
};
const DEFAULT_HIGHLIGHTS = [
  "Оригинальная продукция GA-DE",
  "Дерматологически протестировано",
  "Разработано в Израиле",
];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Товар не найден" };
  return {
    title: product.name,
    description: product.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: product.name,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const outOfStock = product.stock <= 0;
  const onSale = product.oldPriceTiyin && product.oldPriceTiyin > product.priceTiyin;
  const discountPct = onSale
    ? Math.round(((product.oldPriceTiyin! - product.priceTiyin) / product.oldPriceTiyin!) * 100)
    : 0;
  const highlights =
    (product.categorySlug && CATEGORY_HIGHLIGHTS[product.categorySlug]) || DEFAULT_HIGHLIGHTS;

  const related = product.categorySlug
    ? (await listProducts({ categorySlug: product.categorySlug, limit: 12 }).catch(() => []))
        .filter((p) => p.id !== product.id)
        .slice(0, 4)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images,
    description: product.description,
    brand: { "@type": "Brand", name: "GA-DE" },
    offers: {
      "@type": "Offer",
      priceCurrency: "UZS",
      price: Math.round(product.priceTiyin / 100),
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6 overflow-x-auto">
        <Link href="/" className="hover:text-neutral-900 transition-colors">Главная</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link href="/catalog" className="hover:text-neutral-900 transition-colors">Каталог</Link>
        {product.categorySlug && product.categoryName && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              href={`/catalog?category=${product.categorySlug}`}
              className="hover:text-neutral-900 transition-colors"
            >
              {product.categoryName}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-neutral-900 truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <ProductGallery images={product.images} name={product.name} imageFit={product.imageFit} />

        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs uppercase tracking-widest text-neutral-500">GA-DE</span>
            {product.brandLine && (
              <>
                <span className="text-neutral-300">/</span>
                <Link
                  href={`/catalog?line=${product.brandLineSlug ?? ""}`}
                  className="text-xs uppercase tracking-widest text-neutral-700 hover:text-brand-accent transition-colors"
                >
                  {product.brandLine}
                </Link>
              </>
            )}
            {product.isNew && (
              <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 bg-neutral-900 text-white">
                Новинка
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl leading-tight mb-2">{product.name}</h1>

          <div className="flex items-center gap-3 text-xs text-neutral-500 mb-5">
            <span>Артикул: {product.sku}</span>
            {product.volume && (
              <>
                <span className="text-neutral-300">•</span>
                <span>{product.volume}</span>
              </>
            )}
            {product.categoryName && (
              <>
                <span className="text-neutral-300">•</span>
                <span>{product.categoryName}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <span className="text-4xl font-semibold tracking-tight">{formatPrice(product.priceTiyin)}</span>
            {onSale && (
              <>
                <span className="text-lg text-neutral-400 line-through">
                  {formatPrice(product.oldPriceTiyin!)}
                </span>
                <span className="text-xs font-medium px-2 py-1 bg-brand-accent text-white uppercase tracking-wider">
                  −{discountPct}%
                </span>
              </>
            )}
          </div>

          <div className="mb-6 text-sm inline-flex items-center gap-2">
            <span
              className={
                outOfStock
                  ? "h-2 w-2 rounded-full bg-neutral-400"
                  : "h-2 w-2 rounded-full bg-green-600"
              }
            />
            {outOfStock ? (
              <span className="text-neutral-600">Нет в наличии</span>
            ) : (
              <span className="text-green-700">В наличии</span>
            )}
          </div>

          {product.description && (
            <p className="text-[15px] text-neutral-700 leading-relaxed whitespace-pre-line mb-6">
              {product.description}
            </p>
          )}

          <ul className="grid gap-2 mb-8">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-neutral-800">
                <Check className="h-4 w-4 mt-0.5 text-brand-accent shrink-0" strokeWidth={2.5} />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="mt-auto flex items-stretch gap-3 mb-6">
            <div className="flex-1">
              <AddToCartButton
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  priceTiyin: product.priceTiyin,
                  image: product.image,
                  volume: product.volume,
                }}
                disabled={outOfStock}
                maxQuantity={product.stock}
              />
            </div>
            <FavoriteButton
              productId={product.id}
              className="!h-[52px] !w-[52px] !rounded-none border-neutral-900 hover:border-brand-accent"
            />
          </div>

          <div className="space-y-0">
            {product.ingredients && <Section title="Состав">{product.ingredients}</Section>}
            {product.usage && <Section title="Способ применения">{product.usage}</Section>}
            {product.hairType && <Section title="Для типа волос">{product.hairType}</Section>}
            {product.skinType && <Section title="Для типа кожи">{product.skinType}</Section>}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 md:mt-24">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
                Вам может понравиться
              </div>
              <h2 className="text-2xl md:text-3xl">Похожие товары</h2>
            </div>
            {product.categorySlug && (
              <Link
                href={`/catalog?category=${product.categorySlug}`}
                className="text-sm text-neutral-600 hover:text-brand-accent transition-colors whitespace-nowrap"
              >
                Смотреть все →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group border-t border-neutral-200 last:border-b" open={defaultOpen}>
      <summary className="flex items-center justify-between cursor-pointer py-4 font-medium text-sm uppercase tracking-widest list-none [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" strokeWidth={1.5} />
      </summary>
      <div className="pb-4 text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
        {children}
      </div>
    </details>
  );
}
