"use client";

import { useState, useTransition } from "react";
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
    <form onSubmit={handleSubmit} className="bg-white border p-6 space-y-6">
      <Section title="Доставка">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Курьер по Ташкенту, сум">
            <input type="number" value={form.courierCostSum} onChange={num("courierCostSum")} className="w-full border h-10 px-3" />
          </Field>
          <Field label="В регион, сум">
            <input type="number" value={form.regionCostSum} onChange={num("regionCostSum")} className="w-full border h-10 px-3" />
          </Field>
          <Field label="Порог бесплатной доставки, сум">
            <input type="number" value={form.freeDeliveryThresholdSum} onChange={num("freeDeliveryThresholdSum")} className="w-full border h-10 px-3" />
          </Field>
        </div>
      </Section>

      <Section title="Контакты">
        <Field label="Телефон"><input value={form.phone} onChange={str("phone")} className="w-full border h-10 px-3" /></Field>
        <Field label="Telegram (URL)"><input value={form.telegramUrl} onChange={str("telegramUrl")} className="w-full border h-10 px-3" /></Field>
        <Field label="Адрес склада"><input value={form.address} onChange={str("address")} className="w-full border h-10 px-3" /></Field>
      </Section>

      <Section title="Telegram-уведомления">
        <Field label="ID группы менеджеров"><input value={form.telegramOrdersChatId} onChange={str("telegramOrdersChatId")} className="w-full border h-10 px-3" /></Field>
        <Field label="ID технического чата"><input value={form.telegramTechChatId} onChange={str("telegramTechChatId")} className="w-full border h-10 px-3" /></Field>
        <p className="text-xs text-neutral-500">
          Значения в БД перекрывают переменные окружения. Оставьте пустыми, чтобы использовать .env.
        </p>
      </Section>

      <Section title="Главная страница">
        <Field label="Заголовок"><input value={form.heroTitle} onChange={str("heroTitle")} className="w-full border h-10 px-3" /></Field>
        <Field label="Подзаголовок"><textarea value={form.heroSubtitle} onChange={str("heroSubtitle")} rows={3} className="w-full border p-3" /></Field>
      </Section>

      <div className="flex items-center gap-3 pt-4 border-t">
        <button disabled={pending} className="bg-brand text-white h-11 px-6 text-sm uppercase tracking-widest disabled:bg-neutral-400">
          {pending ? "Сохраняем..." : "Сохранить"}
        </button>
        {msg && <span className="text-sm text-neutral-600">{msg}</span>}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium mb-3 uppercase tracking-wider text-neutral-500">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-sm mb-1">{label}</div>{children}</label>;
}
