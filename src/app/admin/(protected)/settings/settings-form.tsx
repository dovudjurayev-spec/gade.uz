"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Truck,
  Route,
  Package,
  Gift,
  Phone,
  Send,
  MapPin,
  Users,
  Wrench,
  Type,
  AlignLeft,
  Check,
} from "lucide-react";
import type { SiteSettings } from "@/services/settings";
import { saveSettingsAction } from "./actions";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function num(k: keyof SiteSettings) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      set(k, Number(e.target.value.replace(/\s/g, "")) as never);
  }
  function str(k: keyof SiteSettings) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(k, e.target.value as never);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveSettingsAction(form);
      setMsg(res.ok ? "Сохранено" : res.error);
      if (res.ok) setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Доставка" icon={Truck} hint="Итоговая цена курьера = база + километраж (округление до 1 000 сум). При сумме заказа выше порога — доставка бесплатно.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IconField label="Курьер: база" hint="Стартовая цена за подачу курьера" icon={Truck} suffix="сум">
            <input type="number" value={form.courierBaseSum} onChange={num("courierBaseSum")} className="w-full bg-transparent text-sm focus:outline-none" />
          </IconField>
          <IconField label="Курьер: за 1 км" hint="Доплата за каждый километр от склада" icon={Route} suffix="сум/км">
            <input type="number" value={form.courierPerKmSum} onChange={num("courierPerKmSum")} className="w-full bg-transparent text-sm focus:outline-none" />
          </IconField>
          <IconField label="В регион" hint="Фиксированная цена доставки в другие города" icon={Package} suffix="сум">
            <input type="number" value={form.regionCostSum} onChange={num("regionCostSum")} className="w-full bg-transparent text-sm focus:outline-none" />
          </IconField>
          <IconField label="Порог бесплатной доставки" hint="Заказы дороже — курьер бесплатно" icon={Gift} suffix="сум">
            <input type="number" value={form.freeDeliveryThresholdSum} onChange={num("freeDeliveryThresholdSum")} className="w-full bg-transparent text-sm focus:outline-none" />
          </IconField>
        </div>
      </Section>

      <Section title="Контакты" icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IconField label="Телефон" hint="Отображается в футере и на карточке контактов" icon={Phone}>
            <input value={form.phone} onChange={str("phone")} className="w-full bg-transparent text-sm focus:outline-none" placeholder="+998 90 000 00 00" />
          </IconField>
          <IconField label="Telegram (URL)" hint="Полная ссылка вида https://t.me/..." icon={Send}>
            <input value={form.telegramUrl} onChange={str("telegramUrl")} className="w-full bg-transparent text-sm focus:outline-none" placeholder="https://t.me/..." />
          </IconField>
          <div className="md:col-span-2">
            <IconField label="Адрес склада" hint="Точка отсчёта расстояния для курьера" icon={MapPin}>
              <input value={form.address} onChange={str("address")} className="w-full bg-transparent text-sm focus:outline-none" />
            </IconField>
          </div>
        </div>
      </Section>

      <Section title="Telegram-уведомления" icon={Send} hint="Значения в БД перекрывают переменные окружения. Оставьте пустыми, чтобы использовать .env.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IconField label="ID группы менеджеров" hint="Куда падают новые заказы" icon={Users}>
            <input value={form.telegramOrdersChatId} onChange={str("telegramOrdersChatId")} className="w-full bg-transparent text-sm focus:outline-none" placeholder="-1001234567890" />
          </IconField>
          <IconField label="ID технического чата" hint="Ошибки синхронизации и алерты" icon={Wrench}>
            <input value={form.telegramTechChatId} onChange={str("telegramTechChatId")} className="w-full bg-transparent text-sm focus:outline-none" placeholder="-1001234567890" />
          </IconField>
        </div>
      </Section>

      <Section title="Главная страница" icon={Type}>
        <div className="space-y-4">
          <IconField label="Заголовок" hint="Крупный текст в hero-блоке" icon={Type}>
            <input value={form.heroTitle} onChange={str("heroTitle")} className="w-full bg-transparent text-sm focus:outline-none" />
          </IconField>
          <IconField label="Подзаголовок" hint="Описание под заголовком, 1–2 строки" icon={AlignLeft} multiline>
            <textarea value={form.heroSubtitle} onChange={str("heroSubtitle")} rows={3} className="w-full bg-transparent text-sm focus:outline-none resize-none" />
          </IconField>
        </div>
      </Section>

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t flex items-center gap-3 px-6 py-4 -mx-6 md:-mx-0 md:rounded-none">
        <button
          disabled={pending}
          className="inline-flex items-center gap-2 bg-neutral-900 text-white h-11 px-6 text-sm uppercase tracking-widest hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
        >
          <Check className="h-4 w-4" strokeWidth={2} />
          {pending ? "Сохраняем..." : "Сохранить"}
        </button>
        {msg && <span className="text-sm text-neutral-600">{msg}</span>}
      </div>
    </form>
  );
}

function Section({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: LucideIcon;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border">
      <header className="flex items-center gap-3 border-b px-6 py-4">
        <div className="h-9 w-9 grid place-items-center rounded-full bg-neutral-900 text-white">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-widest">{title}</div>
          {hint && <div className="text-xs text-neutral-500 mt-0.5">{hint}</div>}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function IconField({
  label,
  hint,
  icon: Icon,
  suffix,
  multiline,
  children,
}: {
  label: string;
  hint?: string;
  icon: LucideIcon;
  suffix?: string;
  multiline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`group flex ${multiline ? "items-start" : "items-center"} gap-3 border border-neutral-200 bg-white px-3 py-2.5 focus-within:border-neutral-900 transition-colors cursor-text`}>
      <div className={`shrink-0 h-9 w-9 grid place-items-center rounded-full bg-neutral-100 text-neutral-600 group-focus-within:bg-neutral-900 group-focus-within:text-white transition-colors ${multiline ? "mt-0.5" : ""}`}>
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
        {children}
        {hint && <div className="text-[11px] text-neutral-400 mt-0.5">{hint}</div>}
      </div>
      {suffix && (
        <span className="shrink-0 text-[11px] uppercase tracking-widest text-neutral-400">
          {suffix}
        </span>
      )}
    </label>
  );
}
