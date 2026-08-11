"use client";

import { useState, useTransition } from "react";
import { createAddressAction } from "./actions";

export function AddressForm() {
  const [label, setLabel] = useState("");
  const [city, setCity] = useState("Ташкент");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [apartment, setApartment] = useState("");
  const [comment, setComment] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createAddressAction({ label, city, district, street, apartment, comment, isDefault });
      if (!res.ok) setError("Не удалось сохранить");
      else {
        setLabel(""); setDistrict(""); setStreet(""); setApartment(""); setComment(""); setIsDefault(false);
      }
    });
  }

  return (
    <form onSubmit={submit} className="border p-4 space-y-3">
      <div className="text-sm font-medium">Новый адрес</div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Название (например «Дом»)" className="w-full h-10 border px-3 text-sm" />
      <div className="grid grid-cols-2 gap-3">
        <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Город" className="h-10 border px-3 text-sm" />
        <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Район" className="h-10 border px-3 text-sm" />
      </div>
      <input required value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Улица, дом" className="w-full h-10 border px-3 text-sm" />
      <input value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder="Квартира / офис" className="w-full h-10 border px-3 text-sm" />
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий для курьера" className="w-full min-h-16 border px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Использовать по умолчанию
      </label>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={pending} className="w-full h-10 bg-brand text-white text-sm uppercase tracking-widest disabled:bg-neutral-400">
        {pending ? "Сохраняем..." : "Сохранить"}
      </button>
    </form>
  );
}
