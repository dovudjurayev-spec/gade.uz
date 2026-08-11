import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProductSlugs, getProductBySlug } from "@/repositories/products";
import { formatPrice } from "@/lib/money";
import { AddToCartButton } from "@/components/catalog/add-to-cart-button";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs().catch(() => [] as string[]);
  return slugs.map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

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
  const lowStock = product.stock > 0 && product.stock < 5;
  const onSale = product.oldPriceTiyin && product.oldPriceTiyin > product.priceTiyin;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    image: product.images,
    description: product.description,
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
    <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div className="aspect-square bg-neutral-100">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-neutral-400">GADE</div>
          )}
        </div>

        <div>
          {product.brandLine && (
            <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
              {product.brandLine}
            </div>
          )}
          <h1 className="text-3xl md:text-4xl mb-4">{product.name}</h1>
          {product.volume && (
            <div className="text-neutral-600 mb-4">{product.volume}</div>
          )}

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-semibold">{formatPrice(product.priceTiyin)}</span>
            {onSale && (
              <span className="text-neutral-400 line-through">
                {formatPrice(product.oldPriceTiyin!)}
              </span>
            )}
          </div>

          <div className="mb-6 text-sm">
            {outOfStock && <span className="text-red-600">Нет в наличии</span>}
            {lowStock && <span className="text-brand-accent">Осталось мало</span>}
            {!outOfStock && !lowStock && <span className="text-green-700">В наличии</span>}
          </div>

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
          />

          <div className="mt-8 space-y-3 text-sm">
            {product.description && <Section title="Описание">{product.description}</Section>}
            {product.ingredients && <Section title="Состав">{product.ingredients}</Section>}
            {product.usage && <Section title="Способ применения">{product.usage}</Section>}
            {product.hairType && <Section title="Для типа волос">{product.hairType}</Section>}
            {product.skinType && <Section title="Для типа кожи">{product.skinType}</Section>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="border-t py-3">
      <summary className="cursor-pointer font-medium">{title}</summary>
      <div className="mt-2 text-neutral-700 whitespace-pre-line">{children}</div>
    </details>
  );
}
