"use client";

import { useEffect, useState } from "react";

type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
  initDataUnsafe?: { user?: { first_name?: string; username?: string } };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const SESSION_KEY = "gade_tg_session";

type State =
  | { kind: "loading"; msg: string }
  | { kind: "ok"; name: string }
  | { kind: "error"; msg: string };

export function TmaClient() {
  const [state, setState] = useState<State>({ kind: "loading", msg: "Инициализация…" });

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const start = async () => {
      // Ждём загрузки telegram-web-app.js (Script загружается параллельно).
      while (!window.Telegram?.WebApp && tries < 50) {
        await new Promise((r) => setTimeout(r, 100));
        tries += 1;
      }
      if (cancelled) return;

      const tg = window.Telegram?.WebApp;
      if (!tg) {
        setState({ kind: "error", msg: "Открой в Telegram — эта страница работает только внутри мини-аппа." });
        return;
      }

      tg.ready();
      tg.expand();

      if (!tg.initData) {
        setState({ kind: "error", msg: "Telegram не передал initData. Перезапусти мини-апп." });
        return;
      }

      setState({ kind: "loading", msg: "Вход…" });
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; sessionToken?: string; error?: string };
        if (!res.ok || !data.ok || !data.sessionToken) {
          setState({ kind: "error", msg: `Ошибка входа: ${data.error ?? res.status}` });
          return;
        }
        try {
          sessionStorage.setItem(SESSION_KEY, data.sessionToken);
        } catch {
          // приватный режим / отключённый sessionStorage — не критично, кука уже стоит
        }
        const name = tg.initDataUnsafe?.user?.first_name || tg.initDataUnsafe?.user?.username || "друг";
        setState({ kind: "ok", name });
        setTimeout(() => {
          window.location.replace("/");
        }, 600);
      } catch (err) {
        setState({ kind: "error", msg: `Сеть недоступна: ${(err as Error).message}` });
      }
    };

    start();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        {state.kind === "loading" && <p className="text-sm text-neutral-600">{state.msg}</p>}
        {state.kind === "ok" && (
          <>
            <p className="text-lg">Привет, {state.name}!</p>
            <p className="text-sm text-neutral-600 mt-2">Открываю каталог…</p>
          </>
        )}
        {state.kind === "error" && <p className="text-sm text-red-600 whitespace-pre-line">{state.msg}</p>}
      </div>
    </div>
  );
}
