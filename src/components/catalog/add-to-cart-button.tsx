"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/stores/cart";

type Props = {
  product: {
    id: number;
    slug: string;
    name: string;
    priceTiyin: number;
    image: string | null;
    volume: string | null;
  };
  disabled?: boolean;
  maxQuantity?: number;
};

export function AddToCartButton({ product, disabled, maxQuantity }: Props) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  const item = items.find((i) => i.productId === product.id);
  const qty = item?.quantity ?? 0;
  const max = typeof maxQuantity === "number" ? Math.max(0, maxQuantity) : Infinity;
  const atMax = qty >= max;

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full min-h-[52px] px-10 text-sm uppercase tracking-widest border border-neutral-200 text-neutral-400 cursor-not-allowed"
      >
        Нет в наличии
      </button>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() =>
          add({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceTiyin: product.priceTiyin,
            image: product.image,
            volume: product.volume,
          })
        }
        className="w-full min-h-[52px] px-10 inline-flex items-center justify-center gap-2 bg-neutral-900 text-white text-sm uppercase tracking-widest hover:bg-neutral-800 transition-colors"
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
        В корзину
      </button>
    );
  }

  return (
    <div className="w-full min-h-[52px] grid grid-cols-3 items-stretch border border-neutral-900">
      <button
        type="button"
        aria-label="Уменьшить"
        onClick={() => setQuantity(product.id, qty - 1)}
        className="grid place-items-center hover:bg-neutral-100 transition-colors"
      >
        <Minus className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <div className="grid place-items-center text-base font-medium select-none">{qty}</div>
      <button
        type="button"
        aria-label="Увеличить"
        disabled={atMax}
        onClick={() => setQuantity(product.id, Math.min(qty + 1, max))}
        className="grid place-items-center hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
