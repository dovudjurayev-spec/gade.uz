// В Telegram WebApp мы намеренно используем window.location.href, а не
// tg.openLink(): openLink открывает URL в ОТДЕЛЬНОМ in-app браузере поверх
// мини-аппа, и Payme-редирект после оплаты уходит туда же, оставляя
// мини-апп на пустой /checkout странице. С window.location.href весь WebView
// мини-аппа переходит на Payme и после успешной оплаты возвращается на
// success page уже внутри мини-аппа.
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  window.location.href = url;
}
