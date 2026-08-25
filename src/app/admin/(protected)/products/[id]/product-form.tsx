"use client";

import { useState, useTransition } from "react";
import { updateProductAction } from "./actions";

type Product = {
  id: number;
  name: string;
  description: string;
  ingredients: string;
  usage: string;
  hairType: string;
  skinType: string;
  images: string[];
  imageFit: "contain" | "cover";
  isFeatured: boolean;
  isNew: boolean;
  isVisible: boolean;
};

export function ProductForm({ product }: { product: Product }) {
  const [form, setForm] = useState(product);
  const [imagesText, setImagesText] = useState(product.images.join("\n"));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const images = imagesText.split("\n").map((s) => s.trim()).filter(Boolean);
      const res = await updateProductAction({ ...form, images });
      setMsg(res.ok ? "Сохранено" : res.error);
      if (res.ok) setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border p-6 space-y-4">
      <Field label="Название">
        <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full border h-10 px-3" />
      </Field>
      <Field label="Описание">
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="w-full border p-3" />
      </Field>
      <Field label="Состав">
        <textarea value={form.ingredients} onChange={(e) => set("ingredients", e.target.value)} rows={3} className="w-full border p-3" />
      </Field>
      <Field label="Способ применения">
        <textarea value={form.usage} onChange={(e) => set("usage", e.target.value)} rows={3} className="w-full border p-3" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Для типа волос"><input value={form.hairType} onChange={(e) => set("hairType", e.target.value)} className="w-full border h-10 px-3" /></Field>
        <Field label="Для типа кожи"><input value={form.skinType} onChange={(e) => set("skinType", e.target.value)} className="w-full border h-10 px-3" /></Field>
      </div>
      <Field label="Изображения (по одному URL/пути на строку)">
        <textarea value={imagesText} onChange={(e) => setImagesText(e.target.value)} rows={4} className="w-full border p-3 font-mono text-xs" />
      </Field>

      <Field label="Отображение фото">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="imageFit"
              checked={form.imageFit === "contain"}
              onChange={() => set("imageFit", "contain")}
            />
            Вписать (белый фон)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="imageFit"
              checked={form.imageFit === "cover"}
              onChange={() => set("imageFit", "cover")}
            />
            Заполнить (без белых полей)
          </label>
        </div>
      </Field>

      <div className="flex gap-6">
        <Check label="Хит" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
        <Check label="Новинка" checked={form.isNew} onChange={(v) => set("isNew", v)} />
        <Check label="Показывать на сайте" checked={form.isVisible} onChange={(v) => set("isVisible", v)} />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <button disabled={pending} className="bg-brand text-white h-11 px-6 text-sm uppercase tracking-widest disabled:bg-neutral-400">
          {pending ? "Сохраняем..." : "Сохранить"}
        </button>
        {msg && <span className="text-sm text-neutral-600">{msg}</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-sm font-medium mb-1">{label}</div>{children}</label>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
