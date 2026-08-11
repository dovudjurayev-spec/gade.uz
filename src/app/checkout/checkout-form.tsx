"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart, cartSubtotal } from "@/stores/cart";
import { formatPrice } from "@/lib/money";
import { submitOrderAction } from "./actions";

const DELIVERY_COST: Record<string, number> = {
  courier_tashkent: 25_000_00,
  region_shipping: 45_000_00,
  pickup: 0,
};
const FREE_THRESHOLD = 500_000_00;

export function CheckoutForm() {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const subtotal = cartSubtotal(items);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [delivery, setDelivery] = useState<"courier_tashkent" | "region_shipping" | "pickup">("courier_tashkent");
  const [payment, setPayment] = useState<"payme" | "click" | "card_on_delivery" | "cash_on_delivery">("payme");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const baseDelivery = DELIVERY_COST[delivery] ?? 0;
  const deliveryCost = delivery === "courier_tashkent" && subtotal >= FREE_THRESHOLD ? 0 : baseDelivery;
  const total = subtotal + deliveryCost;

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-neutral-600">Корзина пуста.</p>
        <Link href="/catalog" className="underline">Вернуться в каталог</Link>
      </div>
    );
  }

  function handlePhone(v: string) {
    // Простая маска +998 XX XXX XX XX
    const digits = v.replace(/\D/g, "").slice(0, 12);
    const rest = digits.startsWith("998") ? digits.slice(3) : digits;
    const parts = [
      rest.slice(0, 2),
      rest.slice(2, 5),
      rest.slice(5, 7),
      rest.slice(7, 9),
    ].filter(Boolean);
    setPhone(`+998 ${parts.join(" ")}`.trim());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitOrderAction({
        name,
        phone,
        deliveryMethod: delivery,
        paymentMethod: payment,
        address: delivery !== "pickup" ? address : undefined,
        comment: comment || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      if (result && !result.ok) {
        setError(result.error);
      } else {
        // redirect произошёл в Server Action — на success-страницу
        clear();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_360px] gap-8">
      <div className="space-y-6">
        <Field label="Ваше имя">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border h-12 px-3"
            placeholder="Дилноза"
          />
        </Field>

        <Field label="Телефон">
          <input
            required
            inputMode="tel"
            value={phone}
            onChange={(e) => handlePhone(e.target.value)}
            className="w-full border h-12 px-3"
            placeholder="+998 __ ___ __ __"
          />
        </Field>

        <Field label="Доставка">
          <div className="space-y-2">
            <Radio name="delivery" value="courier_tashkent" checked={delivery === "courier_tashkent"} onChange={() => setDelivery("courier_tashkent")}>
              Курьер по Ташкенту — 25 000 сум (бесплатно от 500 000)
            </Radio>
            <Radio name="delivery" value="region_shipping" checked={delivery === "region_shipping"} onChange={() => setDelivery("region_shipping")}>
              Отправка в регион — 45 000 сум
            </Radio>
            <Radio name="delivery" value="pickup" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")}>
              Самовывоз со склада — бесплатно
            </Radio>
          </div>
        </Field>

        {delivery !== "pickup" && (
          <Field label="Адрес">
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border h-12 px-3"
              placeholder="Ташкент, Мирабадский р-н, ул. Нукус 12, кв. 5"
            />
          </Field>
        )}

        <Field label="Оплата">
          <div className="space-y-2">
            <Radio name="payment" value="payme" checked={payment === "payme"} onChange={() => setPayment("payme")}>
              Payme — онлайн
            </Radio>
            <Radio name="payment" value="click" checked={payment === "click"} onChange={() => setPayment("click")}>
              Click — онлайн
            </Radio>
            <Radio name="payment" value="card_on_delivery" checked={payment === "card_on_delivery"} onChange={() => setPayment("card_on_delivery")}>
              Картой при получении
            </Radio>
            <Radio name="payment" value="cash_on_delivery" checked={payment === "cash_on_delivery"} onChange={() => setPayment("cash_on_delivery")}>
              Наличными при получении
            </Radio>
          </div>
        </Field>

        <Field label="Комментарий (необязательно)">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full border p-3"
            placeholder="Позвонить после 18:00"
          />
        </Field>
      </div>

      <aside className="border p-6 h-fit sticky top-20 space-y-4">
        <div className="text-sm font-medium">В заказе</div>
        <ul className="space-y-2 text-sm border-b pb-4">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="truncate">{i.name} × {i.quantity}</span>
              <span className="whitespace-nowrap">{formatPrice(i.priceTiyin * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <Row label="Товары" value={formatPrice(subtotal)} />
        <Row label="Доставка" value={deliveryCost === 0 ? "бесплатно" : formatPrice(deliveryCost)} />
        <div className="border-t pt-3 flex justify-between font-semibold text-lg">
          <span>Итого</span>
          <span>{formatPrice(total)}</span>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={pending}
          className="w-full min-h-[52px] bg-brand text-white text-sm uppercase tracking-widest hover:bg-brand-accent transition-colors disabled:bg-neutral-400"
        >
          {pending ? "Оформляем..." : "Оформить заказ"}
        </button>

        <p className="text-xs text-neutral-500">
          Нажимая «Оформить заказ», вы соглашаетесь с публичной офертой.
        </p>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2">{label}</div>
      {children}
    </label>
  );
}

function Radio({
  name, value, checked, onChange, children,
}: {
  name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 border p-3 cursor-pointer hover:border-neutral-900 has-[:checked]:border-brand-accent has-[:checked]:bg-brand-accent/5">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="accent-brand-accent" />
      <span className="text-sm">{children}</span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}
