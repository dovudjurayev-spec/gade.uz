CREATE TABLE IF NOT EXISTS "order_telegram_messages" (
  "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "chat_id" varchar(64) NOT NULL,
  "message_id" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "order_telegram_messages_pk" PRIMARY KEY ("order_id", "chat_id")
);

CREATE INDEX IF NOT EXISTS "otm_order_idx" ON "order_telegram_messages" ("order_id");

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "accepted_at" timestamptz;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_by_manager" varchar(200);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;
