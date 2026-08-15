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
};

export function CardCartButton({ product, disabled }: Props) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);

  const item = items.find((i) => i.productId === product.id);
  const qty = item?.quantity ?? 0;

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full h-10 text-xs uppercase tracking-widest border border-neutral-200 text-neutral-400 cursor-not-allowed"
      >
        Нет в наличии
      </button>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          add({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceTiyin: product.priceTiyin,
            image: product.image,
            volume: product.volume,
          });
        }}
        className="w-full h-10 inline-flex items-center justify-center gap-2 text-xs uppercase tracking-widest bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
        В корзину
      </button>
    );
  }

  return (
    <div className="w-full h-10 grid grid-cols-3 items-stretch border border-neutral-900">
      <button
        type="button"
        aria-label="Уменьшить"
        onClick={(e) => {
          stop(e);
          setQuantity(product.id, qty - 1);
        }}
        className="grid place-items-center hover:bg-neutral-100 transition-colors"
      >
        <Minus className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <div className="grid place-items-center text-sm font-medium select-none">{qty}</div>
      <button
        type="button"
        aria-label="Увеличить"
        onClick={(e) => {
          stop(e);
          setQuantity(product.id, qty + 1);
        }}
        className="grid place-items-center hover:bg-neutral-100 transition-colors"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
