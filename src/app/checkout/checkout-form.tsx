"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { MapPin, Plus, Check, Truck, Package, Store, CreditCard, Banknote, Smartphone, Building2, Navigation, Home, ArrowLeft, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCart, cartSubtotal } from "@/stores/cart";
import { formatPrice } from "@/lib/money";
import { submitOrderAction } from "./actions";
import DeliveryMap from "@/components/DeliveryMap";
import type { DeliveryTariff } from "@/lib/delivery";
import { openExternalUrl } from "@/lib/telegram-open-link";

function isDesktopBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Telegram?: { WebApp?: { initData?: string } } };
  if (w.Telegram?.WebApp?.initData) return false;
  const ua = navigator.userAgent || "";
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
  return !isMobile;
}

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
  const [payment, setPayment] = useState<"payme" | "card_on_delivery" | "cash_on_delivery">("payme");
  const [address, setAddress] = useState(initialAddress);
  const [comment, setComment] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [waitingPayment, setWaitingPayment] = useState<{ number: string; token: string } | null>(null);

  // Пока юзер оплачивает Payme (в приложении или во внешнем браузере),
  // мини-апп остаётся на этой странице. Пуллим статус заказа каждые 3 сек
  // до 15 минут; как только Payme колбэком пометит его paid — уводим на success.
  useEffect(() => {
    if (!waitingPayment) return;
    const { number, token } = waitingPayment;
    const started = Date.now();
    const TIMEOUT_MS = 15 * 60 * 1000;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(number)}/status?t=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const data = (await res.json().catch(() => ({}))) as { status?: string };
        if (data.status === "paid") {
          clearInterval(id);
          router.replace(`/checkout/success/${number}?t=${encodeURIComponent(token)}`);
          return;
        }
      } catch {
        // сеть может моргнуть — просто ждём следующего тика
      }
      if (Date.now() - started > TIMEOUT_MS) {
        clearInterval(id);
        setWaitingPayment(null);
      }
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => clearInterval(id);
  }, [waitingPayment, router]);

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [quote, setQuote] = useState<{ priceTiyin: number; distanceKm: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const coordsLat = coords?.lat;
  const coordsLng = coords?.lng;
  useEffect(() => {
    if (delivery !== "pickup" && payment === "card_on_delivery") {
      setPayment("payme");
    }
  }, [delivery, payment]);

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
  }
  // region_shipping: стоимость доставки считает менеджер после заказа —
  // в итоговую сумму не включаем, показываем плашку в шаге "Оплата".
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

  function isStep1Valid() {
    return name.trim().length > 0 && phone.replace(/\D/g, "").length === 12;
  }
  function isStep2Valid() {
    if (delivery === "courier_tashkent") return address.trim().length > 0 && !!coords;
    if (delivery === "region_shipping") return address.trim().length > 0;
    return true;
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      if (!isStep1Valid()) {
        setError("Укажите имя и телефон в формате +998 XX XXX XX XX");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!isStep2Valid()) {
        setError(
          delivery === "courier_tashkent" && !coords
            ? "Отметьте точку доставки на карте"
            : "Укажите адрес доставки",
        );
        return;
      }
      setStep(3);
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goBack() {
    setError(null);
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function placeOrder() {
    if (step !== 3) return;
    setError(null);
    if (delivery === "courier_tashkent" && !coords) {
      setError("Отметьте точку доставки на карте");
      setStep(2);
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
        return;
      }
      if (result && result.ok && result.redirectUrl) {
        // На десктопе (не TMA и не мобильный браузер) сразу уводим на Payme Web —
        // никакого overlay «Ожидаем оплату» не нужно, страница просто редиректится.
        // На телефоне и в мини-аппе оставляем overlay + пуллинг статуса: universal
        // link на приложение Payme может увести в другое приложение, а вернувшийся
        // юзер по колбэку не всегда попадёт назад на checkout.
        if (isDesktopBrowser()) {
          clear();
          window.location.href = result.redirectUrl;
          return;
        }
        setWaitingPayment({ number: result.orderNumber, token: result.orderToken });
        openExternalUrl(result.redirectUrl);
        return;
      }
      // Оффлайн-оплата: redirect() уже сработал в Server Action.
      clear();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const el = e.target as HTMLElement;
          const tag = el.tagName;
          if (tag !== "TEXTAREA" && tag !== "BUTTON") {
            e.preventDefault();
          }
        }
      }}
    >
      {waitingPayment && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur grid place-items-center px-6 text-center">
          <div>
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl mb-2">Ожидаем оплату</h2>
            <p className="text-sm text-neutral-600 max-w-sm">
              Не закрывайте страницу. Как только оплата пройдёт — мы автоматически покажем подтверждение заказа.
            </p>
            <button
              type="button"
              onClick={() => setWaitingPayment(null)}
              className="mt-6 text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-900"
            >
              Отменить ожидание
            </button>
          </div>
        </div>
      )}
      <StepIndicator step={step} onStepClick={(s) => { if (s < step) { setStep(s); setError(null); } }} />

      <div className="grid md:grid-cols-[1fr_360px] gap-8 mt-10">
      <div className="space-y-6">
        {step === 1 && (<>
        <StepHeader n={1} title="Контакты" subtitle="Как с вами связаться курьеру и менеджеру" />
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
        </>)}

        {step === 2 && (<>
        <StepHeader n={2} title="Доставка" subtitle="Куда и как доставить заказ" />
        <Field label="Способ доставки">
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
              subtitle="Стоимость уточнит менеджер"
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
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-3">
              Адрес доставки
            </div>
            <div className="border border-neutral-200 bg-white">
              <AddressPicker
                value={address}
                onChange={setAddress}
                options={savedAddresses}
              />
              <div className="border-t border-neutral-200">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-5 transition-colors ${
                    coords ? "bg-white" : "bg-neutral-50"
                  }`}
                >
                  <div className="shrink-0 h-10 w-10 grid place-items-center rounded-md bg-neutral-900 text-white">
                    <MapPin className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {coords ? "Точка на карте отмечена" : "Отметьте точку на карте"}
                    </div>
                    <div className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                      {coords
                        ? "Стоимость доставки рассчитана точно по координатам."
                        : "Так мы точно рассчитаем стоимость доставки до вашего дома."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMap((v) => !v)}
                    className={`shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 text-xs uppercase tracking-widest transition-colors cursor-pointer ${
                      coords
                        ? "border border-neutral-300 hover:border-neutral-900 bg-white"
                        : "bg-neutral-900 hover:bg-black text-white"
                    }`}
                  >
                    {showMap ? "Скрыть" : coords ? "Изменить" : "Открыть карту"}
                  </button>
                </div>
                {showMap && (
                  <div className="border-t border-neutral-100">
                    <DeliveryMap value={coords} onChange={setCoords} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {delivery === "region_shipping" && (
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-3">
              Адрес доставки
            </div>
            <div className="border border-neutral-200 bg-white">
              <AddressPicker
                value={address}
                onChange={setAddress}
                options={savedAddresses}
              />
            </div>
            <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
              Стоимость доставки в регионы зависит от адреса. После оформления менеджер свяжется с вами и уточнит тариф.
            </p>
          </div>
        )}
        </>)}

        {step === 3 && (<>
        <StepHeader n={3} title="Оплата и подтверждение" subtitle="Выберите способ оплаты" />
        <Field label="Оплата">
          <div className="grid gap-2 sm:grid-cols-2">
            <OptionTile
              icon={Smartphone}
              title="Payme"
              subtitle="Онлайн-оплата"
              checked={payment === "payme"}
              onSelect={() => setPayment("payme")}
            />
            {delivery === "pickup" && (
              <OptionTile
                icon={CreditCard}
                title="Картой при самовывозе"
                subtitle="Оплата на складе"
                checked={payment === "card_on_delivery"}
                onSelect={() => setPayment("card_on_delivery")}
              />
            )}
            <OptionTile
              icon={Banknote}
              title="Наличными"
              subtitle={delivery === "pickup" ? "На складе при получении" : "Курьеру при получении"}
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

        <ReviewSummary
          name={name}
          phone={phone}
          delivery={delivery}
          address={address}
          coords={coords}
          payment={payment}
        />
        </>)}

        {error && (
          <div className="border border-red-200 bg-red-50 text-sm text-red-700 px-4 py-3">
            {error}
          </div>
        )}
      </div>

      <aside className="md:self-start border p-6 space-y-4"><div className="space-y-4">
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
        <DeliveryRow
          delivery={delivery}
          coords={coords}
          quote={quote}
          quoting={quoting}
          quoteError={quoteError}
          deliveryCost={deliveryCost}
        />
        {quoteError && (
          <div className="text-xs text-red-600 -mt-2">{quoteError}</div>
        )}
        <div className="border-t pt-3 flex justify-between font-semibold text-lg">
          <span>
            {delivery === "courier_tashkent" && !coords ? "Предварительно" : "Итого"}
          </span>
          <span>
            {delivery === "courier_tashkent" && !coords && (
              <span className="text-neutral-500 font-normal text-sm mr-1">от</span>
            )}
            {formatPrice(total)}
          </span>
        </div>
        {delivery === "courier_tashkent" && !coords && (
          <div className="-mt-2 text-xs text-neutral-500 leading-relaxed">
            Указана цена за товары. Стоимость доставки добавим после того,
            как вы отметите точку на карте на шаге «Доставка».
          </div>
        )}

        <p className="text-xs text-neutral-500">
          Нажимая «Оформить заказ», вы соглашаетесь с публичной офертой.
        </p>
      </div></aside>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 mt-8 pt-6 border-t border-neutral-100">
        {step > 1 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 text-xs uppercase tracking-widest text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Назад
          </button>
        ) : (
          <Link
            href="/cart"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 text-xs uppercase tracking-widest text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            К корзине
          </Link>
        )}
        {step < 3 ? (() => {
          const canProceed = step === 1 ? isStep1Valid() : isStep2Valid();
          return (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed}
              className={`sm:ml-auto inline-flex items-center justify-center gap-2 h-12 px-10 text-white text-xs uppercase tracking-widest transition-colors ${
                canProceed
                  ? "bg-neutral-900 hover:bg-black cursor-pointer"
                  : "bg-neutral-300 cursor-not-allowed"
              }`}
            >
              Далее
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          );
        })() : (
          <button
            type="button"
            onClick={placeOrder}
            disabled={pending}
            className="sm:ml-auto inline-flex items-center justify-center gap-2 h-12 px-10 bg-neutral-900 hover:bg-black text-white text-xs uppercase tracking-widest transition-colors cursor-pointer disabled:bg-neutral-400"
          >
            {pending ? "Оформляем…" : "Оформить заказ"}
          </button>
        )}
      </div>
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

const STEPS = [
  { n: 1, title: "Контакты" },
  { n: 2, title: "Доставка" },
  { n: 3, title: "Оплата" },
] as const;

function StepIndicator({
  step,
  onStepClick,
}: {
  step: 1 | 2 | 3;
  onStepClick: (s: 1 | 2 | 3) => void;
}) {
  return (
    <div role="list" className="flex items-center w-full">
      {STEPS.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        const clickable = done;
        return (
          <Fragment key={s.n}>
            <button
              type="button"
              role="listitem"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(s.n as 1 | 2 | 3)}
              className={`flex items-center gap-3 shrink-0 ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`shrink-0 h-9 w-9 grid place-items-center border text-xs font-medium transition-colors ${
                  active
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : done
                      ? "bg-white text-neutral-900 border-neutral-900"
                      : "bg-white text-neutral-400 border-neutral-200"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2} /> : s.n}
              </span>
              <span
                className={`hidden sm:inline text-xs uppercase tracking-widest whitespace-nowrap ${
                  active ? "text-neutral-900" : done ? "text-neutral-700" : "text-neutral-400"
                }`}
              >
                {s.title}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 sm:mx-6 transition-colors ${
                  step > s.n ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="pb-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Шаг {n} из 3</div>
      <h2 className="text-2xl md:text-3xl mt-1">{title}</h2>
      {subtitle && <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>}
    </div>
  );
}

const DELIVERY_LABELS: Record<string, string> = {
  courier_tashkent: "Курьер по Ташкенту",
  region_shipping: "В регион (BTS)",
  pickup: "Самовывоз",
};
const PAYMENT_LABELS: Record<string, string> = {
  payme: "Payme (онлайн)",
  card_on_delivery: "Картой при самовывозе",
  cash_on_delivery: "Наличными при получении",
};

function ReviewSummary({
  name,
  phone,
  delivery,
  address,
  coords,
  payment,
}: {
  name: string;
  phone: string;
  delivery: string;
  address: string;
  coords: { lat: number; lng: number } | null;
  payment: string;
}) {
  return (
    <div className="border border-neutral-200 bg-neutral-50 p-5 space-y-3">
      <div className="text-xs uppercase tracking-widest text-neutral-500">Проверьте данные</div>
      <SummaryLine label="Имя" value={name || "—"} />
      <SummaryLine label="Телефон" value={phone || "—"} />
      <SummaryLine label="Доставка" value={DELIVERY_LABELS[delivery] ?? delivery} />
      {(delivery === "courier_tashkent" || delivery === "region_shipping") && (
        <SummaryLine label="Адрес" value={address || "—"} />
      )}
      {delivery === "courier_tashkent" && coords && (
        <SummaryLine
          label="Точка на карте"
          value={`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
        />
      )}
      <SummaryLine label="Оплата" value={PAYMENT_LABELS[payment] ?? payment} />
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-32 shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 flex-1 text-neutral-900 break-words">{value}</span>
    </div>
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
    return <AddressComposer value={value} onChange={onChange} bare />;
  }

  return (
    <div>
      <div className="p-4 grid gap-2 sm:grid-cols-2">
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
                  className={`shrink-0 h-9 w-9 grid place-items-center rounded-md transition-colors ${
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
              className={`shrink-0 h-9 w-9 grid place-items-center rounded-md transition-colors ${
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
        <div className="border-t border-neutral-100">
          <AddressComposer value={value} onChange={onChange} autoFocusRef={inputRef} bare />
        </div>
      )}

      <div className="flex justify-end px-4 pb-3">
        <Link
          href="/account/addresses"
          className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
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
  bare,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocusRef?: React.RefObject<HTMLInputElement | null>;
  bare?: boolean;
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

  const body = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
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
      <div className="border-t border-neutral-100">
        <ComposerField
          icon={Home}
          label="Улица, дом, квартира"
          placeholder="ул. Нукус 12, кв. 5"
          value={street}
          onChange={(v) => update({ street: v })}
          required
        />
      </div>
    </>
  );

  if (bare) return <div>{body}</div>;

  return (
    <div className="border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {body}
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
    <label className="group flex items-center gap-3 px-5 py-4 focus-within:bg-neutral-50 hover:bg-neutral-50/60 transition-colors cursor-text">
      <div className="shrink-0 h-9 w-9 grid place-items-center rounded-md bg-neutral-100 text-neutral-500 group-focus-within:bg-neutral-900 group-focus-within:text-white transition-colors">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.15em] font-medium text-neutral-500 group-focus-within:text-neutral-900 transition-colors">
          {label}
          {required && <span className="text-neutral-900 ml-0.5">*</span>}
        </div>
        <input
          ref={inputRef}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-neutral-900 focus:outline-none placeholder:text-neutral-300 mt-0.5"
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

function DeliveryRow({
  delivery,
  coords,
  quote,
  quoting,
  quoteError,
  deliveryCost,
}: {
  delivery: "courier_tashkent" | "region_shipping" | "pickup";
  coords: { lat: number; lng: number } | null;
  quote: { priceTiyin: number; distanceKm: number } | null;
  quoting: boolean;
  quoteError: string | null;
  deliveryCost: number;
}) {
  const needsPoint = delivery === "courier_tashkent" && !coords;
  const label =
    delivery === "courier_tashkent" && quote
      ? `Доставка · ${quote.distanceKm} км`
      : "Доставка";

  if (needsPoint) return null;

  let value: React.ReactNode;
  let valueClass = "";
  if (quoting) {
    value = (
      <span className="inline-flex items-center gap-2 text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
        считаем…
      </span>
    );
  } else if (quoteError) {
    value = "—";
    valueClass = "text-neutral-500";
  } else if (delivery === "region_shipping") {
    value = "уточнит менеджер";
    valueClass = "text-neutral-500";
  } else if (deliveryCost === 0) {
    value = "Бесплатно";
    valueClass = "text-emerald-700 font-medium";
  } else {
    value = formatPrice(deliveryCost);
  }

  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-600">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
