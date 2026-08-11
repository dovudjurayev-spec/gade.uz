"use client";

import { useState, useTransition } from "react";
import { createPromoAction, updatePromoAction, deletePromoAction } from "./actions";

type Promo = {
  id: number;
  code: string;
  discountPercent: number | null;
  discountTiyin: number | null;
  minOrderTiyin: number;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
};

export function PromoNewRow() {
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [minSum, setMinSum] = useState("");
  const [limit, setLimit] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const res = await createPromoAction({
        code: code.trim(),
        discountPercent: percent ? Number(percent) : undefined,
        minOrderSum: minSum ? Number(minSum) : 0,
        usageLimit: limit ? Number(limit) : undefined,
      });
      if (res.ok) {
        setCode(""); setPercent(""); setMinSum(""); setLimit("");
      } else {
        alert(res.error);
      }
    });
  }

  return (
    <tr className="border-t bg-neutral-50">
      <td className="px-3 py-2"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" className="border h-9 px-2 w-full" /></td>
      <td className="px-3 py-2"><input value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="10%" className="border h-9 px-2 w-full" /></td>
      <td className="px-3 py-2"><input value={minSum} onChange={(e) => setMinSum(e.target.value)} placeholder="сум" className="border h-9 px-2 w-full" /></td>
      <td className="px-3 py-2"><input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="∞" className="border h-9 px-2 w-full" /></td>
      <td className="px-3 py-2 text-neutral-500">—</td>
      <td className="px-3 py-2">
        <button onClick={handleAdd} disabled={pending || !code} className="bg-brand text-white h-9 px-3 text-xs disabled:bg-neutral-400">
          Добавить
        </button>
      </td>
    </tr>
  );
}

export function PromoRow({ promo, formattedMin }: { promo: Promo; formattedMin: string }) {
  const [active, setActive] = useState(promo.isActive);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !active;
      const res = await updatePromoAction({ id: promo.id, isActive: next });
      if (res.ok) setActive(next);
    });
  }

  function remove() {
    if (!confirm(`Удалить промокод ${promo.code}?`)) return;
    startTransition(() => { void deletePromoAction({ id: promo.id }); });
  }

  return (
    <tr className="border-t">
      <td className="px-3 py-2 font-mono">{promo.code}</td>
      <td className="px-3 py-2">
        {promo.discountPercent != null ? `${promo.discountPercent}%` : ""}
        {promo.discountTiyin != null ? ` ${Math.round(promo.discountTiyin / 100)} сум` : ""}
      </td>
      <td className="px-3 py-2">{formattedMin}</td>
      <td className="px-3 py-2">{promo.usageCount}{promo.usageLimit != null ? ` / ${promo.usageLimit}` : ""}</td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={toggle} disabled={pending} />
          <span className="text-xs">{active ? "вкл" : "выкл"}</span>
        </label>
      </td>
      <td className="px-3 py-2">
        <button onClick={remove} disabled={pending} className="text-xs text-red-600 hover:underline">Удалить</button>
      </td>
    </tr>
  );
}
