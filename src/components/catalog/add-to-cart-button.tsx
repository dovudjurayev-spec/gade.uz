"use client";

import { useState } from "react";
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

export function AddToCartButton({ product, disabled }: Props) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  function handleClick() {
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceTiyin: product.priceTiyin,
      image: product.image,
      volume: product.volume,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className="w-full md:w-auto min-h-[52px] px-10 bg-brand text-white text-sm uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
    >
      {disabled ? "Нет в наличии" : added ? "Добавлено ✓" : "В корзину"}
    </button>
  );
}
