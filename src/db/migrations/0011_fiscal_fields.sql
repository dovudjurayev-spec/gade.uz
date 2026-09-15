ALTER TABLE "products" ADD COLUMN "ikpu" varchar(17);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "package_code" varchar(32);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "vat_percent" integer DEFAULT 0 NOT NULL;
