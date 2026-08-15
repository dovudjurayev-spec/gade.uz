"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/money";
import type { ProductListItem } from "@/repositories/types";

export function HeroPromoCarousel({ products }: { products: ProductListItem[] }) {
  const [index, setIndex] = useState(0);
  const items = products.slice(0, 5);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const p = items[index];
  const onSale = p.oldPriceTiyin && p.oldPriceTiyin > p.priceTiyin;
  const discount = onSale
    ? Math.round(((p.oldPriceTiyin! - p.priceTiyin) / p.oldPriceTiyin!) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-xl px-4 md:px-8">
      <Link
        href={`/catalog/${p.slug}`}
        key={p.id}
        className="group flex items-center gap-4 bg-white rounded-2xl p-3 md:p-4 hover:shadow-lg transition-shadow animate-in fade-in duration-500"
      >
        <div className="relative h-24 w-24 shrink-0 rounded-xl bg-neutral-100 overflow-hidden">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-neutral-400 text-[10px]">
              GADE
            </div>
          )}
          {onSale && (
            <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              −{discount}%
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
            Хит продаж
          </div>
          <div className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
            {p.name}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-neutral-900">
              {formatPrice(p.priceTiyin)}
            </span>
            {onSale && (
              <span className="text-[11px] text-neutral-400 line-through">
                {formatPrice(p.oldPriceTiyin!)}
              </span>
            )}
          </div>
        </div>

        <span
          aria-hidden
          className="shrink-0 w-11 h-11 rounded-full bg-neutral-900 text-white grid place-items-center group-hover:bg-neutral-700 transition-colors"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </span>
      </Link>

      {items.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Показать ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
