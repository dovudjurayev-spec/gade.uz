import Link from "next/link";
import { formatPrice } from "@/lib/money";
import type { ProductListItem } from "@/repositories/types";
import { cn } from "@/lib/cn";

export function ProductCard({ product }: { product: ProductListItem }) {
  const outOfStock = product.stock <= 0;
  const onSale = product.oldPriceTiyin && product.oldPriceTiyin > product.priceTiyin;

  return (
    <Link
      href={`/catalog/${product.slug}`}
      className="group block border border-neutral-200 hover:border-neutral-900 transition-colors"
    >
      <div className="relative aspect-square bg-neutral-100 overflow-hidden">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-neutral-400 text-xs">GADE</div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && <Badge>Новинка</Badge>}
          {onSale && <Badge tone="accent">Скидка</Badge>}
          {outOfStock && <Badge tone="muted">Нет в наличии</Badge>}
        </div>
      </div>

      <div className="p-4">
        {product.brandLine && (
          <div className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
            {product.brandLine}
          </div>
        )}
        <div className="text-sm font-medium leading-snug min-h-[2.5rem]">{product.name}</div>
        {product.volume && (
          <div className="text-xs text-neutral-500 mt-1">{product.volume}</div>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          <span className={cn("font-sans font-semibold", outOfStock && "text-neutral-400")}>
            {formatPrice(product.priceTiyin)}
          </span>
          {onSale && (
            <span className="text-xs text-neutral-400 line-through">
              {formatPrice(product.oldPriceTiyin!)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  const styles = {
    default: "bg-brand text-white",
    accent: "bg-brand-accent text-white",
    muted: "bg-neutral-200 text-neutral-700",
  } as const;
  return (
    <span className={cn("px-2 py-0.5 text-[10px] uppercase tracking-wider", styles[tone])}>
      {children}
    </span>
  );
}
