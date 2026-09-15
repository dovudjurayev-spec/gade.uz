"use client";

import { useEffect } from "react";
import { openExternalUrl } from "@/lib/telegram-open-link";

export function RedirectToPayment({ url }: { url: string }) {
  useEffect(() => {
    openExternalUrl(url);
  }, [url]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-neutral-600">Переход на страницу оплаты…</p>
      <p className="mt-4 text-xs text-neutral-400">
        Если ничего не произошло —{" "}
        <a href={url} className="underline">
          нажмите здесь
        </a>
        .
      </p>
    </div>
  );
}
