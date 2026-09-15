// В Telegram WebApp обычный переход window.location.href на внешний домен
// работает, но пользователь «застревает» на payme.uz без нативной кнопки назад
// в мини-апп. Правильный путь — Telegram.WebApp.openLink(), тогда Payme
// откроется поверх мини-аппа со штатным UI Телеграма.
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string) => void } } })
    .Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url);
    return;
  }
  window.location.href = url;
}
