ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telegram_id" bigint;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telegram_username" varchar(64);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telegram_photo_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_telegram_id_idx" ON "customers" ("telegram_id") WHERE "telegram_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "cross_site" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD COLUMN IF NOT EXISTS "customer_id" integer REFERENCES "customers"("id") ON DELETE CASCADE;
