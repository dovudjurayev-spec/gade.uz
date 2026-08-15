"use client";

import { useEffect, useTransition } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/stores/favorites";

export function FavoriteButton({ productId, className = "" }: { productId: number; className?: string }) {
  const load = useFavorites((s) => s.load);
  const toggle = useFavorites((s) => s.toggle);
  const isFav = useFavorites((s) => s.ids.has(productId));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void load();
  }, [load]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => {
      void toggle(productId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={isFav ? "Убрать из избранного" : "В избранное"}
      aria-pressed={isFav}
      className={`grid place-items-center h-9 w-9 rounded-full bg-white/90 backdrop-blur border border-neutral-200 hover:border-neutral-900 transition-colors cursor-pointer ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-neutral-700"}`}
        strokeWidth={1.5}
      />
    </button>
  );
}
