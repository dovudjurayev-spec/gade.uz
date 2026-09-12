"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight, Heart } from "lucide-react";
import { useCart, cartSubtotal } from "@/stores/cart";
import { formatPrice } from "@/lib/money";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = cartSubtotal(items);

  if (items.length === 0) {
    const suggestions = [
      { label: "Макияж", href: "/catalog?category=makeup" },
      { label: "Уход за лицом", href: "/catalog?category=face-care" },
      { label: "Парфюмерия", href: "/catalog?category=perfume" },
      { label: "Аксессуары", href: "/catalog?category=accessories" },
    ];

    return (
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="hidden md:flex order-1 justify-center">
            <ShoppingBag className="h-56 w-56 text-neutral-800" strokeWidth={1} />
          </div>

          <div className="order-2">
            <div className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-4">
              Корзина
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-900 mb-4 leading-[1.1]">
              Здесь пока пусто
            </h1>
            <p className="text-neutral-600 mb-8 max-w-md leading-relaxed">
              Загляните в каталог — соберите ритуал ухода, любимые оттенки и ароматы. Всё, что есть в наличии, — уже здесь.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/catalog"
                className="inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black text-white px-8 py-4 text-xs uppercase tracking-widest transition-colors"
              >
                В каталог
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <Link
                href="/account/favorites"
                className="inline-flex items-center justify-center gap-2 border border-neutral-300 hover:border-neutral-900 text-neutral-900 px-8 py-4 text-xs uppercase tracking-widest transition-colors"
              >
                <Heart className="h-4 w-4" strokeWidth={1.5} />
                Избранное
              </Link>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-3">
                Популярные разделы
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="inline-flex items-center gap-1.5 border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white text-neutral-700 px-4 py-2 text-sm transition-colors"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <h1 className="text-2xl md:text-3xl mb-6">Корзина</h1>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="flex gap-4 border p-4">
              <div className="w-24 h-24 bg-white flex-shrink-0">
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-full w-full object-contain p-2" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/catalog/${item.slug}`} className="font-medium hover:text-brand-accent">
                  {item.name}
                </Link>
                {item.volume && <div className="text-xs text-neutral-500">{item.volume}</div>}
                <div className="mt-2 font-semibold">{formatPrice(item.priceTiyin)}</div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  className="text-xs text-neutral-500 hover:text-red-600"
                >
                  Удалить
                </button>
                <div className="flex items-center border">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity - 1)}
                    className="w-10 h-10 hover:bg-neutral-100"
                    aria-label="Уменьшить"
                  >
                    −
                  </button>
                  <span className="w-10 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.productId, item.quantity + 1)}
                    className="w-10 h-10 hover:bg-neutral-100"
                    aria-label="Увеличить"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="border p-6 h-fit sticky top-20">
          <div className="flex justify-between text-sm mb-2">
            <span>Товары</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="text-sm mb-4 text-neutral-400">
            <div className="flex justify-between">
              <span>Доставка</span>
              <span>—</span>
            </div>
            <div className="mt-1">рассчитается при оформлении</div>
          </div>
          <div className="border-t pt-4 flex justify-between font-semibold text-lg mb-6">
            <span>Итого</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <Link
            href="/checkout"
            className="block w-full text-center bg-brand text-white py-4 text-sm uppercase tracking-widest hover:bg-brand-accent transition-colors"
          >
            Оформить заказ
          </Link>
        </aside>
      </div>
    </div>
  );
}
