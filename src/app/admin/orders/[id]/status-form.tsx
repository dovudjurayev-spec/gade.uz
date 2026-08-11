"use client";

import { useState, useTransition } from "react";
import { ORDER_STATUS_LABEL } from "@/lib/order-labels";
import { updateOrderStatusAction } from "./actions";

export function StatusForm({ orderId, currentStatus }: { orderId: number; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateOrderStatusAction({ orderId, status });
      setMsg(res.ok ? "Сохранено" : res.error);
      if (res.ok) setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border p-4 flex items-center gap-3">
      <span className="text-sm">Статус:</span>
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="border h-10 px-3 text-sm">
        {Object.entries(ORDER_STATUS_LABEL).map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>
      <button disabled={pending} className="bg-brand text-white h-10 px-4 text-sm disabled:bg-neutral-400">
        {pending ? "..." : "Сохранить"}
      </button>
      {msg && <span className="text-sm text-neutral-600">{msg}</span>}
    </form>
  );
}
