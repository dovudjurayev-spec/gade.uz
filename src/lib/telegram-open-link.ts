type Tg = {
  ready?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

// Открывает внешний URL из мини-аппа. Внутри Telegram зовём tg.openLink —
// он открывает страницу в системном браузере / in-app SFSafariViewController,
// где universal link «Открыть в приложении Payme» подхватывается iOS/Android.
// Вне Telegram — обычная навигация.
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { Telegram?: { WebApp?: Tg } };
  const tg = w.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.ready?.();
    tg.openLink(url);
    return;
  }
  window.location.href = url;
}
