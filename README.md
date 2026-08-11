# gade.uz

Интернет-магазин официального дистрибьютора **GADE Cosmetics** в Узбекистане.

Стек: **Next.js 15 (App Router, standalone)** · TypeScript · Tailwind · Drizzle ORM · PostgreSQL. Хостинг — **aHOST (TAS-IX), тариф Smart**, домен `gade.uz`.

Подробное ТЗ — см. `PROMPT-gade-ecommerce.md`.

---

## Локальная разработка

```bash
cp .env.example .env
npm install
npm run db:generate     # сгенерировать миграции из schema.ts
npm run db:migrate      # применить на локальный Postgres
npm run dev
```

Открыть http://localhost:3000

### Полезные команды

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер |
| `npm run build` | production-сборка (`output: standalone`) |
| `npm run start` | запуск собранного standalone |
| `npm run typecheck` | tsc без эмита |
| `npm run lint` | ESLint |
| `npm run db:generate` | новая миграция из schema.ts |
| `npm run db:migrate` | применить миграции |
| `npm run db:studio` | Drizzle Studio |

---

## Структура

```
src/
├── app/                  # App Router (страницы, layouts, route handlers)
├── components/           # UI-компоненты
│   └── layout/           # header, footer
├── db/                   # Drizzle: schema, client, миграции
├── lib/                  # env, money, cn, утилиты общего назначения
├── services/             # бизнес-логика (заказы, каталог, оплата) — TODO
└── repositories/         # доступ к БД (изоляция от Drizzle) — TODO
```

Все цены хранятся в **тийинах** (integer). Форматирование — `src/lib/money.ts`.

---

## Деплой на aHOST (production)

1. **Сборка в CI (не на сервере).** GitHub Actions собирает `.next/standalone` и публикует артефакт `gade-uz-standalone`.
2. Скачать артефакт, распаковать, загрузить содержимое `app/` в отдельную релизную директорию на сервере:
   ```
   ~/apps/gade-uz/releases/2026-08-10-<git-sha>/
   ```
3. Переключить симлинк:
   ```
   ln -sfn ~/apps/gade-uz/releases/2026-08-10-<git-sha> ~/apps/gade-uz/current
   ```
4. В cPanel → **Setup Node.js App**:
   - Node.js **22 LTS**, mode `production`
   - Application root: `~/apps/gade-uz/current`
   - Startup file: `server.js`
   - Environment variables — из `.env` (файл вне `public_html`)
5. **Restart App** в Node.js Selector.
6. Хранить последние **3 релиза**, старые удалять.

### Cron (cPanel → Cron Jobs)

```
*/5  * * * *   curl -s -H "X-Cron-Token: $CRON_TOKEN" https://gade.uz/api/cron/sync-stock
*/15 * * * *   curl -s -H "X-Cron-Token: $CRON_TOKEN" https://gade.uz/api/cron/sync-prices
0    * * * *   curl -s -H "X-Cron-Token: $CRON_TOKEN" https://gade.uz/api/cron/sync-catalog
*/2  * * * *   curl -s -H "X-Cron-Token: $CRON_TOKEN" https://gade.uz/api/cron/process-queue
0    3 * * *   ~/scripts/backup.sh
30   3 * * *   curl -s https://gade.uz/api/cron/sitemap
```

### Бэкапы

- Ежедневный `pg_dump` + архив `~/uploads` в 03:00
- Хранение 30 дней, ротация в скрипте
- Штатный бэкап cPanel как второй контур
- **Проверка восстановления обязательна до запуска** — восстанавливаем в `dev.gade.uz`

### Ограничения shared-хостинга (важно!)

- Passenger усыпляет процесс — **никакого `setInterval`** для фоновых задач, только внешний cron
- Redis нет — кэш каталога через ISR + LRU в памяти процесса
- Лимиты LVE (память, CPU, число процессов) — уточнить в поддержке aHOST до нагрузочного теста
- Никаких внешних CDN (Cloudflare proxy, Google Fonts, jsDelivr) — трафик должен идти через TAS-IX

---

## Что дальше (roadmap)

**Этап 0 — done:** каркас (Next.js, Drizzle-схема, layout, CI, docs).

**Этап 1 — MVP (в работе):**
- Каталог + фильтры + карточка товара
- Корзина (Zustand + localStorage)
- Оформление на одной странице
- Payme + Click + оплата при получении
- Telegram-бот менеджеров
- Односторонняя выгрузка каталога из Bitrix

**Этап 2 — Bitrix (двусторонний):** очередь заказов → Bitrix24, живые остатки, sync_log в админке.

**Этап 3 — рост:** кабинет, квиз, промокоды, узбекский, SEO.

**Этап 4 — запуск:** нагрузка, проверка бэкапа, наполнение, обучение менеджера.
