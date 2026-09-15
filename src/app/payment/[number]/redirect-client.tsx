"use client";

import { useEffect } from "react";

type Tg = {
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  ready?: () => void;
};

export function RedirectToPayment({ url }: { url: string }) {
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const run = async () => {
      // telegram-web-app.js грузится afterInteractive — подождём, чтобы не
      // упасть в fallback window.location.href, который навигирует сам WebView
      // мини-аппа и оставляет юзера без «Открыть в приложении».
      while (
        !(window as unknown as { Telegram?: { WebApp?: Tg } }).Telegram?.WebApp &&
        tries < 30
      ) {
        await new Promise((r) => setTimeout(r, 100));
        tries += 1;
      }
      if (cancelled) return;
      const tg = (window as unknown as { Telegram?: { WebApp?: Tg } }).Telegram?.WebApp;
      if (tg?.openLink) {
        tg.ready?.();
        tg.openLink(url);
        return;
      }
      window.location.href = url;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-600">
      Открываем оплату…
    </div>
  );
}
