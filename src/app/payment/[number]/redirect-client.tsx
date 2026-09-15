"use client";

import { useEffect } from "react";

type Tg = {
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  ready?: () => void;
};

export function RedirectToPayment({ url }: { url: string }) {
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: Tg } }).Telegram?.WebApp;
    if (tg?.openLink) {
      // Открываем чекаут Payme в системном браузере — universal link «Открыть в
      // приложении» подхватится iOS/Android. Возврат в мини-апп идёт через
      // callback URL (t.me deep-link) в самой ссылке.
      tg.ready?.();
      tg.openLink(url);
      return;
    }
    window.location.href = url;
  }, [url]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-600">
      Открываем оплату…
    </div>
  );
}
