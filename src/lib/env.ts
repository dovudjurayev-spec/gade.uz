import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("https://gade.uz"),

  CRON_TOKEN: z.string().min(16).optional(),

  BITRIX_WEBHOOK_URL: z.string().url().optional(),
  BITRIX_INBOUND_TOKEN: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ORDERS_CHAT_ID: z.string().optional(),
  TELEGRAM_TECH_CHAT_ID: z.string().optional(),

  ESKIZ_EMAIL: z.string().email().optional(),
  ESKIZ_PASSWORD: z.string().optional(),
  ESKIZ_FROM: z.string().optional(),

  PAYME_MERCHANT_ID: z.string().optional(),
  PAYME_MERCHANT_KEY: z.string().optional(),
  CLICK_MERCHANT_ID: z.string().optional(),
  CLICK_SERVICE_ID: z.string().optional(),
  CLICK_SECRET_KEY: z.string().optional(),

  SENTRY_DSN: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
