CREATE TYPE "public"."delivery_method" AS ENUM('courier_tashkent', 'region_shipping', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('payme', 'click', 'card_on_delivery', 'cash_on_delivery');--> statement-breakpoint
CREATE TYPE "public"."sync_direction" AS ENUM('bitrix_to_site', 'site_to_bitrix');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('ok', 'error', 'retrying');--> statement-breakpoint
CREATE TABLE "bitrix_id_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" varchar(32) NOT NULL,
	"site_id" integer NOT NULL,
	"bitrix_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"image_path" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(200) NOT NULL,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"image_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"label" varchar(100),
	"city" varchar(100) NOT NULL,
	"district" varchar(100),
	"street" varchar(300) NOT NULL,
	"apartment" varchar(50),
	"comment" text,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" varchar(200),
	"email" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" varchar(300) NOT NULL,
	"sku" varchar(64) NOT NULL,
	"quantity" integer NOT NULL,
	"price_tiyin" bigint NOT NULL,
	"total_tiyin" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" varchar(20) NOT NULL,
	"customer_id" integer,
	"customer_name" varchar(200) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"delivery_address" text,
	"delivery_cost_tiyin" bigint DEFAULT 0 NOT NULL,
	"subtotal_tiyin" bigint NOT NULL,
	"discount_tiyin" bigint DEFAULT 0 NOT NULL,
	"total_tiyin" bigint NOT NULL,
	"promo_code" varchar(64),
	"comment" text,
	"telegram_message_id" bigint,
	"accepted_by_manager" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_tx_id" varchar(128),
	"amount_tiyin" bigint NOT NULL,
	"status" varchar(32) NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(200) NOT NULL,
	"sku" varchar(64) NOT NULL,
	"name" varchar(300) NOT NULL,
	"category_id" integer,
	"brand_line_id" integer,
	"volume" varchar(32),
	"description" text,
	"ingredients" text,
	"usage" text,
	"hair_type" varchar(64),
	"skin_type" varchar(64),
	"price_tiyin" bigint NOT NULL,
	"old_price_tiyin" bigint,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"discount_percent" integer,
	"discount_tiyin" bigint,
	"min_order_tiyin" bigint DEFAULT 0 NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"direction" "sync_direction" NOT NULL,
	"entity" varchar(32) NOT NULL,
	"entity_id" varchar(64),
	"status" "sync_status" NOT NULL,
	"error" text,
	"duration_ms" integer,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_line_id_brand_lines_id_fk" FOREIGN KEY ("brand_line_id") REFERENCES "public"."brand_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bitrix_map_entity_site_idx" ON "bitrix_id_map" USING btree ("entity","site_id");--> statement-breakpoint
CREATE INDEX "bitrix_map_entity_bitrix_idx" ON "bitrix_id_map" USING btree ("entity","bitrix_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_lines_slug_idx" ON "brand_lines" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "favorites_customer_product_idx" ON "favorites" USING btree ("customer_id","product_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("number");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "otp_codes_phone_idx" ON "otp_codes" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "outbound_queue_pending_idx" ON "outbound_queue" USING btree ("completed_at","next_attempt_at");--> statement-breakpoint
CREATE INDEX "payment_tx_order_idx" ON "payment_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_tx_provider_idx" ON "payment_transactions" USING btree ("provider","provider_tx_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_line_idx" ON "products" USING btree ("brand_line_id");--> statement-breakpoint
CREATE INDEX "products_visible_idx" ON "products" USING btree ("is_visible");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sync_log_created_idx" ON "sync_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sync_log_status_idx" ON "sync_log" USING btree ("status");