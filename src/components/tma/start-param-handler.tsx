"use client";

import { useEffect } from "react";

type Tg = {
  ready?: () => void;
  initDataUnsafe?: { start_param?: string };
};

// Читает start_param на любой странице мини-аппа. Нужен для возврата после
// оплаты Payme: Telegram резюмирует уже открытый мини-апп на предыдущем роуте
// (например /checkout), а не заново грузит /tma, поэтому редирект на success
// делаем глобально.
export function StartParamHandler() {
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const run = async () => {
      while (!(window as unknown as { Telegram?: { WebApp?: Tg } }).Telegram?.WebApp && tries < 30) {
        await new Promise((r) => setTimeout(r, 100));
        tries += 1;
      }
      if (cancelled) return;
      const tg = (window as unknown as { Telegram?: { WebApp?: Tg } }).Telegram?.WebApp;
      const startParam = tg?.initDataUnsafe?.start_param ?? "";
      const m = /^paid_([A-Za-z0-9-]+)_([A-Za-z0-9_-]+)$/.exec(startParam);
      if (m) {
        const [, number, token] = m;
        window.location.replace(`/checkout/success/${number}?t=${encodeURIComponent(token ?? "")}`);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
