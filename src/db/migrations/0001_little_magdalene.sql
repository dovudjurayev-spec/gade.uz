ALTER TABLE "products" ADD COLUMN "billz_id" varchar(64);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode" varchar(64);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "billz_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "products_billz_id_idx" ON "products" USING btree ("billz_id");--> statement-breakpoint
CREATE INDEX "products_barcode_idx" ON "products" USING btree ("barcode");