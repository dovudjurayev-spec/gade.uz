// Генерирует валидный Telegram initData от заданного бот-токена.
// Нужен для ручного прогона /api/auth/telegram curl'ом без реального Telegram.
//
// Использование:
//   npx tsx src/scripts/gen-test-initdata.ts
//   # или с кастомным пользователем/токеном:
//   TELEGRAM_TMA_BOT_TOKEN=xxx npx tsx src/scripts/gen-test-initdata.ts --id 12345 --first Иван --username ivan
//
// Затем:
//   curl -X POST http://localhost:3001/api/auth/telegram \
//     -H "Content-Type: application/json" -H "Origin: http://localhost:3001" \
//     -d "{\"initData\":\"$(...output...)\"}"

import { createHmac } from "node:crypto";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? String(process.argv[i + 1]) : fallback;
}

const botToken = process.env.TELEGRAM_TMA_BOT_TOKEN || arg("token", "");
if (!botToken) {
  console.error("TELEGRAM_TMA_BOT_TOKEN не задан. Передайте env или --token <botToken>");
  process.exit(1);
}

const user = {
  id: Number(arg("id", "424242")),
  first_name: arg("first", "Тест"),
  last_name: arg("last", "Пользователь"),
  username: arg("username", "testuser"),
  language_code: "ru",
};

const fields: Record<string, string> = {
  auth_date: String(Math.floor(Date.now() / 1000)),
  query_id: "dev_" + Math.random().toString(36).slice(2, 10),
  user: JSON.stringify(user),
};

const dataCheckString = Object.entries(fields)
  .map(([k, v]) => `${k}=${v}`)
  .sort()
  .join("\n");

const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

const params = new URLSearchParams();
for (const [k, v] of Object.entries(fields)) params.set(k, v);
params.set("hash", hash);

process.stdout.write(params.toString() + "\n");
