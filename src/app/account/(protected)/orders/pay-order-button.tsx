"use client";

import { useState, useTransition } from "react";
import { payOrderAction } from "@/app/checkout/actions";
import { openExternalUrl } from "@/lib/telegram-open-link";

function isDesktopBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Telegram?: { WebApp?: { initData?: string } } };
  if (w.Telegram?.WebApp?.initData) return false;
  const ua = navigator.userAgent || "";
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua);
  return !isMobile;
}

export function PayOrderButton({
  orderNumber,
  className,
  label = "Оплатить заказ",
}: {
  orderNumber: string;
  className?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const desktop = isDesktopBrowser();
      const result = await payOrderAction(orderNumber, { returnMode: desktop ? "web" : "tma" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (desktop) {
        window.location.href = result.redirectUrl;
      } else {
        openExternalUrl(result.redirectUrl);
      }
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={
          className ??
          "inline-flex items-center justify-center bg-neutral-900 text-white text-sm px-5 py-3 hover:bg-neutral-800 disabled:opacity-60 transition-colors"
        }
      >
        {pending ? "Открываем Payme…" : label}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
