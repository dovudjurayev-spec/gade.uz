import { env } from "./env";

/**
 * Разрешённые Origin для мутирующих запросов из кросс-сайтовых сессий (SameSite=None).
 * Обычные сессии (SameSite=Lax) защищены браузером и не требуют этой проверки.
 */
export function allowedOrigins(): string[] {
  const appOrigin = new URL(env.APP_URL).origin;
  return [
    appOrigin,
    "https://web.telegram.org",
    "https://webk.telegram.org",
    "https://webz.telegram.org",
    "https://k.telegram.org",
    "https://a.telegram.org",
    "https://t.me",
  ];
}

/**
 * true, если Origin запроса разрешён (или запрос same-origin и заголовка нет).
 * Для мутирующих запросов от TMA-сессии заголовок Origin обязателен.
 */
export function originAllowed(req: Request, requireOrigin: boolean): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return !requireOrigin;
  return allowedOrigins().includes(origin);
}
