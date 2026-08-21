ALTER TABLE "products" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_default_uniq" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."is_default" = true;--> statement-breakpoint
CREATE INDEX "products_deleted_idx" ON "products" USING btree ("deleted_at");