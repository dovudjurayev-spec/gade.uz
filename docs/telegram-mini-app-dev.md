# Разработка Telegram Mini App (вход через `/api/auth/telegram`)

Эндпоинт валидирует Telegram `initData` и создаёт сессию с cookie
`SameSite=None; Secure; Partitioned` — то есть **не работает по HTTP в dev-режиме**.
Ниже — как поднять локально.

## 1. Тестовый бот в BotFather

Прод-бот `@gadeuzbot` (`TELEGRAM_BOT_TOKEN`) обслуживает боевой webhook на заказы —
его трогать нельзя. Заведите **отдельного тестового бота**:

1. В Telegram открыть [@BotFather](https://t.me/BotFather) → `/newbot` → задать имя,
   например `gade_dev_<ваш_ник>_bot`.
2. Скопировать выданный токен → положить в `.env.local` как
   `TELEGRAM_TMA_BOT_TOKEN=<токен_тестового_бота>`.
3. `/setdomain` в BotFather → указать https-домен вашего туннеля (см. п.2).
4. `/newapp` → создать Mini App, привязать к боту, указать URL мини-аппа
   (тот же https-домен туннеля, обычно `/tma` или корень).

## 2. Cloudflare Tunnel — стабильный HTTPS-поддомен

Используем **Cloudflare Tunnel**, не ngrok: бесплатный именованный туннель сохраняет
поддомен между перезапусками, а ngrok в бесплатном тарифе меняет URL.

```bash
brew install cloudflared
cloudflared tunnel login                # авторизация в Cloudflare, если ещё нет
cloudflared tunnel create gade-dev      # разово: создаёт tunnel + creds
cloudflared tunnel route dns gade-dev gade-dev.<ваш-домен>.tld
```

`~/.cloudflared/config.yml`:

```yaml
tunnel: gade-dev
credentials-file: /Users/<you>/.cloudflared/<uuid>.json

ingress:
  - hostname: gade-dev.<ваш-домен>.tld
    service: http://localhost:3001
  - service: http_status:404
```

Запуск:

```bash
cloudflared tunnel run gade-dev
```

Теперь `https://gade-dev.<ваш-домен>.tld` проксирует в локальный `next dev` на `:3001`.

В `.env.local` выставить:

```env
APP_URL=https://gade-dev.<ваш-домен>.tld
NODE_ENV=development
TELEGRAM_TMA_BOT_TOKEN=<токен_тестового_бота>
```

## 3. Ручной прогон эндпоинта без Telegram

Не поднимая мини-апп в клиенте Telegram, можно проверить `/api/auth/telegram` через
`curl` — есть скрипт-генератор валидного `initData`:

```bash
# Токен берётся из TELEGRAM_TMA_BOT_TOKEN, можно переопределить флагами
npx tsx src/scripts/gen-test-initdata.ts \
  --id 424242 --first Иван --username ivan_dev
# → auth_date=...&query_id=...&user=...&hash=...

INIT=$(npx tsx src/scripts/gen-test-initdata.ts)
curl -X POST https://gade-dev.<ваш-домен>.tld/api/auth/telegram \
  -H "Content-Type: application/json" \
  -H "Origin: https://gade-dev.<ваш-домен>.tld" \
  -d "$(printf '{"initData":"%s"}' "$INIT")"
# → { "ok": true, "sessionToken": "..." }
```

`sessionToken` можно использовать напрямую заголовком:

```bash
curl https://gade-dev.<ваш-домен>.tld/api/favorites \
  -H "Authorization: Bearer $SESSION"
```

## 4. Что смотрит сервер

- `Origin` запроса обязан быть в allowlist:
  `APP_URL`, `https://web.telegram.org` и родственные `https://*.telegram.org`, `https://t.me`.
  Иначе — 403 `forbidden_origin`.
- Подпись `initData` проверяется через `HMAC_SHA256("WebAppData", botToken)` →
  `HMAC_SHA256(secret, data_check_string)` с константным `timingSafeEqual`.
  `auth_date` не старше 1 часа.
- При успехе создаётся customer (если такого `telegram_id` ещё нет) и сессия
  с флагом `cross_site=true`. Кука `gade_customer` ставится
  `SameSite=None; Secure; Partitioned` — иначе Chrome не отдаст её в iframe
  `web.telegram.org`.
- Тот же id сессии возвращается в теле как `sessionToken` — мини-апп хранит его
  в `sessionStorage` и шлёт `Authorization: Bearer <token>` на fetch'ах, чтобы
  работать даже там, где браузер режет кросс-сайт куки (Safari, некоторые webview).

## 5. Что НЕ делаем

- Не логируем `initData`, `botToken` и `sessionToken`.
- Не переключаем прод-бота `@gadeuzbot` на dev-URL — сломается webhook на заказы.
- Не деплоим с 29.08 по 01.09 — выходные Дня независимости, поддержка Payme/Click
  недоступна.
