"use client";

import { useState, useTransition } from "react";
import { MapPin, Tag, Building2, Navigation, Home, MessageSquare, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import DeliveryMap from "@/components/DeliveryMap";
import { createAddressAction } from "./actions";

export function AddressForm() {
  const [label, setLabel] = useState("");
  const [city, setCity] = useState("Ташкент");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [comment, setComment] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canSubmit = city.trim().length > 0 && street.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createAddressAction({
        label, city, district, street, comment, isDefault,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      if (!res.ok) setError("Не удалось сохранить");
      else {
        setLabel(""); setDistrict(""); setStreet(""); setComment("");
        setIsDefault(false); setCoords(null); setShowMap(false);
      }
    });
  }

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-3">
        Добавить адрес
      </div>
      <form onSubmit={submit} className="border border-neutral-200 bg-white">
        <div className="divide-y divide-neutral-100">
          <ComposerField
            icon={Tag}
            label="Название"
            placeholder="Например: Дом, Офис"
            value={label}
            onChange={setLabel}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
            <ComposerField
              icon={Building2}
              label="Город"
              placeholder="Ташкент"
              value={city}
              onChange={setCity}
              required
            />
            <ComposerField
              icon={Navigation}
              label="Район"
              placeholder="Например: Мирабадский"
              value={district}
              onChange={setDistrict}
            />
          </div>
          <ComposerField
            icon={Home}
            label="Улица, дом, квартира"
            placeholder="ул. Нукус 12, кв. 5"
            value={street}
            onChange={setStreet}
            required
          />
          <ComposerTextarea
            icon={MessageSquare}
            label="Комментарий для курьера"
            placeholder="Домофон, этаж, ориентиры…"
            value={comment}
            onChange={setComment}
          />
        </div>

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
                  ? "Курьер приедет точно по координатам."
                  : "Так курьер быстрее найдёт ваш дом."}
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

        <div className="border-t border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="inline-flex items-center gap-2.5 text-sm text-neutral-700 cursor-pointer select-none">
            <span className="relative inline-flex h-4 w-4 items-center justify-center border border-neutral-400">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="peer absolute inset-0 opacity-0 cursor-pointer"
              />
              <span className="hidden peer-checked:inline-flex absolute inset-0 items-center justify-center bg-neutral-900 text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </span>
            Использовать по умолчанию
          </label>
          {error && (
            <div className="text-sm text-red-600 sm:ml-auto">{error}</div>
          )}
          <button
            type="submit"
            disabled={pending || !canSubmit}
            className={`sm:ml-auto inline-flex items-center justify-center h-12 px-10 text-white text-xs uppercase tracking-widest transition-colors ${
              canSubmit && !pending
                ? "bg-neutral-900 hover:bg-black cursor-pointer"
                : "bg-neutral-300 cursor-not-allowed"
            }`}
          >
            {pending ? "Сохраняем…" : "Сохранить адрес"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ComposerField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="group flex items-center gap-4 px-5 py-4 transition-colors focus-within:bg-neutral-50 cursor-text">
      <div className="shrink-0 h-9 w-9 grid place-items-center rounded-md bg-neutral-100 text-neutral-700 transition-colors group-focus-within:bg-neutral-900 group-focus-within:text-white">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
          {label}{required && <span className="text-neutral-900 ml-0.5">*</span>}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent border-0 outline-none text-sm text-neutral-900 placeholder:text-neutral-400 mt-0.5"
        />
      </div>
    </label>
  );
}

function ComposerTextarea({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="group flex items-start gap-4 px-5 py-4 transition-colors focus-within:bg-neutral-50 cursor-text">
      <div className="shrink-0 h-9 w-9 grid place-items-center rounded-md bg-neutral-100 text-neutral-700 transition-colors group-focus-within:bg-neutral-900 group-focus-within:text-white mt-0.5">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-neutral-500">
          {label}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent border-0 outline-none text-sm text-neutral-900 placeholder:text-neutral-400 mt-0.5 resize-none"
        />
      </div>
    </label>
  );
}
