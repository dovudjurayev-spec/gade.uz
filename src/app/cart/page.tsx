"use client";

import Link from "next/link";
import { useCart, cartSubtotal } from "@/stores/cart";
import { formatPrice } from "@/lib/money";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const subtotal = cartSubtotal(items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-8 py-16 text-center">
        <h1 className="text-2xl mb-4">Корзина пуста</h1>
        <p className="text-neutral-600 mb-8">Начните с каталога — там всё, что есть в наличии.</p>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center bg-brand text-white px-8 py-3 text-sm uppercase tracking-widest hover:bg-brand-accent transition-colors"
        >
          В каталог
        </Link>
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
          <div className="text-sm mb-4">
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
