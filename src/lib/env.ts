import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url().default("postgresql://build:build@localhost:5432/build"),
  APP_URL: z.string().url().default("https://gade.uz"),

  CRON_TOKEN: z.string().min(16).optional(),

  BITRIX_WEBHOOK_URL: z.string().url().optional(),
  BITRIX_INBOUND_TOKEN: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ORDERS_CHAT_ID: z.string().optional(),
  TELEGRAM_TECH_CHAT_ID: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
  // Токен бота, обслуживающего Telegram Mini App (валидация initData).
  // Отдельно от TELEGRAM_BOT_TOKEN, который используется для админ-уведомлений о заказах.
  TELEGRAM_TMA_BOT_TOKEN: z.string().optional(),

  ORDER_TOKEN_SECRET: z.string().min(32).optional(),

  ESKIZ_EMAIL: z.string().email().optional(),
  ESKIZ_PASSWORD: z.string().optional(),
  ESKIZ_FROM: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default("GADE.uz <no-reply@gade.uz>"),

  PAYME_MERCHANT_ID: z.string().optional(),
  PAYME_MERCHANT_KEY: z.string().optional(),
  CLICK_MERCHANT_ID: z.string().optional(),
  CLICK_SERVICE_ID: z.string().optional(),
  CLICK_SECRET_KEY: z.string().optional(),

  SENTRY_DSN: z.string().url().optional(),

  ADMIN_LOGIN: z.string().min(3).default("admin"),
  ADMIN_PASSWORD_HASH: z.string().optional(), // формат: scrypt$<salt_hex>$<hash_hex>
  ADMIN_SESSION_SECRET: z.string().min(32).optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
