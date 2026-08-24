"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { MapPin, Plus, Check, Truck, Package, Store, CreditCard, Banknote, Smartphone, Building2, Navigation, Home, DoorOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCart, cartSubtotal } from "@/stores/cart";
import { formatPrice } from "@/lib/money";
import { submitOrderAction } from "./actions";
import DeliveryMap from "@/components/DeliveryMap";
import type { DeliveryTariff } from "@/lib/delivery";

type SavedAddress = { id: number; label: string; value: string; isDefault: boolean };

type Props = {
  initialName?: string;
  initialPhone?: string;
  initialAddress?: string;
  savedAddresses?: SavedAddress[];
  tariff: DeliveryTariff;
};

export function CheckoutForm({
  initialName = "",
  initialPhone = "",
  initialAddress = "",
  savedAddresses = [],
  tariff,
}: Props) {
  const REGION_DELIVERY = tariff.regionTiyin;
  const FREE_THRESHOLD = tariff.freeThresholdTiyin;
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const subtotal = cartSubtotal(items);

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone || "+998 ");
  const [delivery, setDelivery] = useState<"courier_tashkent" | "region_shipping" | "pickup">("courier_tashkent");
  const [payment, setPayment] = useState<"payme" | "click" | "card_on_delivery" | "cash_on_delivery">("payme");
  const [address, setAddress] = useState(initialAddress);
  const [comment, setComment] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<{ priceTiyin: number; distanceKm: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const coordsLat = coords?.lat;
  const coordsLng = coords?.lng;
  useEffect(() => {
    if (delivery !== "courier_tashkent" || coordsLat == null || coordsLng == null) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);
    fetch("/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: coordsLat, lng: coordsLng, subtotalTiyin: subtotal }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setQuote({ priceTiyin: data.priceTiyin, distanceKm: data.distanceKm });
          if (data.address) setAddress(data.address);
        } else {
          setQuote(null);
          setQuoteError(data.error ?? "Не удалось рассчитать");
        }
      })
      .catch(() => {
        if (!cancelled) setQuoteError("Не удалось рассчитать доставку");
      })
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [coordsLat, coordsLng, subtotal, delivery]);

  let deliveryCost = 0;
  if (delivery === "courier_tashkent") {
    deliveryCost = subtotal >= FREE_THRESHOLD ? 0 : quote?.priceTiyin ?? 0;
  } else if (delivery === "region_shipping") {
    deliveryCost = REGION_DELIVERY;
  }
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
    if (delivery === "courier_tashkent" && !coords) {
      setError("Отметьте точку доставки на карте");
      return;
    }
    const finalAddress =
      delivery === "courier_tashkent" || delivery === "region_shipping"
        ? address
        : undefined;
    startTransition(async () => {
      const result = await submitOrderAction({
        name,
        phone,
        deliveryMethod: delivery,
        paymentMethod: payment,
        address: finalAddress,
        deliveryLat: delivery === "courier_tashkent" ? coords?.lat : undefined,
        deliveryLng: delivery === "courier_tashkent" ? coords?.lng : undefined,
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
            placeholder=""
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
          <div className="grid gap-2 sm:grid-cols-2">
            <OptionTile
              icon={Truck}
              title="Курьер по Ташкенту"
              subtitle={`От ${formatPrice(tariff.baseTiyin)} · бесплатно от ${formatPrice(FREE_THRESHOLD)}`}
              checked={delivery === "courier_tashkent"}
              onSelect={() => setDelivery("courier_tashkent")}
            />
            <OptionTile
              icon={Package}
              title="В регион"
              subtitle={formatPrice(REGION_DELIVERY)}
              checked={delivery === "region_shipping"}
              onSelect={() => setDelivery("region_shipping")}
            />
            <OptionTile
              icon={Store}
              title="Самовывоз"
              subtitle="Бесплатно, со склада"
              checked={delivery === "pickup"}
              onSelect={() => setDelivery("pickup")}
            />
          </div>
        </Field>

        {delivery === "courier_tashkent" && (
          <>
            <Field label="Адрес">
              <AddressPicker
                value={address}
                onChange={setAddress}
                options={savedAddresses}
              />
            </Field>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMap((v) => !v)}
                className="inline-flex items-center gap-2 border border-neutral-300 hover:border-neutral-900 h-11 px-4 text-sm uppercase tracking-widest transition-colors"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                {showMap ? "Скрыть карту" : coords ? "Изменить точку на карте" : "Уточнить точку на карте"}
              </button>
              {!coords && (
                <p className="text-xs text-neutral-500">
                  Отметьте точку на карте — так мы точно рассчитаем стоимость доставки.
                </p>
              )}
              {showMap && (
                <div className="pt-2">
                  <DeliveryMap value={coords} onChange={setCoords} />
                </div>
              )}
            </div>
          </>
        )}

        {delivery === "region_shipping" && (
          <Field label="Адрес">
            <AddressPicker
              value={address}
              onChange={setAddress}
              options={savedAddresses}
            />
          </Field>
        )}

        <Field label="Оплата">
          <div className="grid gap-2 sm:grid-cols-2">
            <OptionTile
              icon={Smartphone}
              title="Payme"
              subtitle="Онлайн-оплата"
              checked={payment === "payme"}
              onSelect={() => setPayment("payme")}
            />
            <OptionTile
              icon={Smartphone}
              title="Click"
              subtitle="Онлайн-оплата"
              checked={payment === "click"}
              onSelect={() => setPayment("click")}
            />
            <OptionTile
              icon={CreditCard}
              title="Картой при получении"
              subtitle="Терминал у курьера"
              checked={payment === "card_on_delivery"}
              onSelect={() => setPayment("card_on_delivery")}
            />
            <OptionTile
              icon={Banknote}
              title="Наличными"
              subtitle="При получении"
              checked={payment === "cash_on_delivery"}
              onSelect={() => setPayment("cash_on_delivery")}
            />
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

      <aside className="md:sticky md:top-24 md:self-start border p-6 space-y-4 md:max-h-[calc(100vh-8rem)] md:overflow-auto"><div className="space-y-4">
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
        <Row
          label={
            delivery === "courier_tashkent" && quote
              ? `Доставка · ${quote.distanceKm} км`
              : "Доставка"
          }
          value={
            delivery === "courier_tashkent" && !coords
              ? "укажите точку"
              : quoting
                ? "считаем…"
                : quoteError
                  ? "—"
                  : deliveryCost === 0
                    ? "бесплатно"
                    : formatPrice(deliveryCost)
          }
        />
        {quoteError && (
          <div className="text-xs text-red-600 -mt-2">{quoteError}</div>
        )}
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
      </div></aside>
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

function OptionTile({
  icon: Icon,
  title,
  subtitle,
  checked,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative text-left border p-4 transition-colors cursor-pointer ${
        checked
          ? "border-neutral-900 bg-neutral-50"
          : "border-neutral-200 hover:border-neutral-400"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 h-9 w-9 grid place-items-center rounded-full transition-colors ${
            checked ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">
              {subtitle}
            </div>
          )}
        </div>
        {checked && (
          <Check className="absolute top-2 right-2 h-4 w-4 text-neutral-900" strokeWidth={2} />
        )}
      </div>
    </button>
  );
}

function AddressPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SavedAddress[];
}) {
  const savedMatch = options.find((o) => o.value === value);
  const [mode, setMode] = useState<"saved" | "custom">(
    options.length === 0 || (value && !savedMatch) ? "custom" : "saved",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "custom" && !savedMatch) {
      inputRef.current?.focus();
    }
  }, [mode, savedMatch]);

  if (options.length === 0) {
    return <AddressComposer value={value} onChange={onChange} />;
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const active = mode === "saved" && opt.value === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setMode("saved");
                onChange(opt.value);
              }}
              className={`group relative text-left border p-4 transition-colors cursor-pointer ${
                active
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 h-9 w-9 grid place-items-center rounded-full transition-colors ${
                    active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <MapPin className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{opt.label}</span>
                    {opt.isDefault && (
                      <span className="shrink-0 text-[10px] uppercase tracking-widest text-neutral-500 border border-neutral-200 px-1.5 py-0.5">
                        основной
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                    {opt.value}
                  </div>
                </div>
                {active && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-neutral-900" strokeWidth={2} />
                )}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setMode("custom");
            onChange("");
          }}
          className={`group text-left border border-dashed p-4 transition-colors cursor-pointer ${
            mode === "custom"
              ? "border-neutral-900 bg-neutral-50"
              : "border-neutral-300 hover:border-neutral-500"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`shrink-0 h-9 w-9 grid place-items-center rounded-full transition-colors ${
                mode === "custom" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
              }`}
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-medium">Другой адрес</div>
              <div className="text-xs text-neutral-500">Ввести вручную</div>
            </div>
          </div>
        </button>
      </div>

      {mode === "custom" && (
        <div className="pt-2">
          <AddressComposer value={value} onChange={onChange} autoFocusRef={inputRef} />
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Link
          href="/account/addresses"
          className="text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          Управлять адресами →
        </Link>
      </div>
    </div>
  );
}

function parseAddress(value: string) {
  const parts = value.split(",").map((p) => p.trim());
  const aptIdx = parts.findIndex((p) => /^кв\.?\s*/i.test(p));
  const apartment = aptIdx >= 0 ? (parts[aptIdx] ?? "").replace(/^кв\.?\s*/i, "").trim() : "";
  const rest = aptIdx >= 0 ? parts.slice(0, aptIdx) : parts;
  return {
    city: rest[0] ?? "",
    district: rest[1] ?? "",
    street: rest.slice(2).join(", ") ?? "",
    apartment,
  };
}

function joinAddress(p: { city: string; district: string; street: string; apartment: string }) {
  const bits = [p.city, p.district, p.street].map((s) => s.trim()).filter(Boolean);
  if (p.apartment.trim()) bits.push(`кв. ${p.apartment.trim()}`);
  return bits.join(", ");
}

function AddressComposer({
  value,
  onChange,
  autoFocusRef,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocusRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const initial = parseAddress(value);
  const [city, setCity] = useState(initial.city);
  const [district, setDistrict] = useState(initial.district);
  const [street, setStreet] = useState(initial.street);
  const [apartment, setApartment] = useState(initial.apartment);

  function update(next: Partial<{ city: string; district: string; street: string; apartment: string }>) {
    const merged = { city, district, street, apartment, ...next };
    setCity(merged.city);
    setDistrict(merged.district);
    setStreet(merged.street);
    setApartment(merged.apartment);
    onChange(joinAddress(merged));
  }

  return (
    <div className="border bg-white">
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200">
        <ComposerField
          icon={Building2}
          label="Город"
          placeholder="Ташкент"
          value={city}
          onChange={(v) => update({ city: v })}
          inputRef={autoFocusRef}
          required
        />
        <ComposerField
          icon={Navigation}
          label="Район"
          placeholder="Мирабадский"
          value={district}
          onChange={(v) => update({ district: v })}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 border-t border-neutral-200">
        <ComposerField
          icon={Home}
          label="Улица и дом"
          placeholder="ул. Нукус 12"
          value={street}
          onChange={(v) => update({ street: v })}
          required
        />
        <ComposerField
          icon={DoorOpen}
          label="Квартира"
          placeholder="5"
          value={apartment}
          onChange={(v) => update({ apartment: v })}
        />
      </div>
    </div>
  );
}

function ComposerField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  inputRef,
  required,
}: {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  required?: boolean;
}) {
  return (
    <label className="group flex items-center gap-3 px-4 py-3 focus-within:bg-neutral-50 transition-colors cursor-text">
      <div className="shrink-0 h-8 w-8 grid place-items-center rounded-full bg-neutral-100 text-neutral-500 group-focus-within:bg-neutral-900 group-focus-within:text-white transition-colors">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
        <input
          ref={inputRef}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-300"
        />
      </div>
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
