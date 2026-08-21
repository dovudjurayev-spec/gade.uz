import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// Prices are stored in tiyin (1 UZS = 100 tiyin) as integers.

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "confirmed",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentMethod = pgEnum("payment_method", [
  "payme",
  "click",
  "card_on_delivery",
  "cash_on_delivery",
]);

export const deliveryMethod = pgEnum("delivery_method", [
  "courier_tashkent",
  "region_shipping",
  "pickup",
]);

export const syncDirection = pgEnum("sync_direction", [
  "bitrix_to_site",
  "site_to_bitrix",
]);

export const syncStatus = pgEnum("sync_status", ["ok", "error", "retrying"]);

// --- Catalog ---

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    parentId: integer("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    imagePath: text("image_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(t.slug),
    parentIdx: index("categories_parent_idx").on(t.parentId),
  }),
);

export const brandLines = pgTable(
  "brand_lines",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    imagePath: text("image_path"),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("brand_lines_slug_idx").on(t.slug),
  }),
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    name: varchar("name", { length: 300 }).notNull(),
    categoryId: integer("category_id").references(() => categories.id),
    brandLineId: integer("brand_line_id").references(() => brandLines.id),
    volume: varchar("volume", { length: 32 }),
    description: text("description"),
    ingredients: text("ingredients"),
    usage: text("usage"),
    hairType: varchar("hair_type", { length: 64 }),
    skinType: varchar("skin_type", { length: 64 }),
    priceTiyin: bigint("price_tiyin", { mode: "number" }).notNull(),
    oldPriceTiyin: bigint("old_price_tiyin", { mode: "number" }),
    stock: integer("stock").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    billzId: varchar("billz_id", { length: 64 }),
    barcode: varchar("barcode", { length: 64 }),
    billzUpdatedAt: timestamp("billz_updated_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("products_slug_idx").on(t.slug),
    skuIdx: uniqueIndex("products_sku_idx").on(t.sku),
    categoryIdx: index("products_category_idx").on(t.categoryId),
    brandLineIdx: index("products_brand_line_idx").on(t.brandLineId),
    visibleIdx: index("products_visible_idx").on(t.isVisible),
    billzIdx: uniqueIndex("products_billz_id_idx").on(t.billzId),
    barcodeIdx: index("products_barcode_idx").on(t.barcode),
    deletedIdx: index("products_deleted_idx").on(t.deletedAt),
  }),
);

// --- Customers & auth ---

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull(),
    name: varchar("name", { length: 200 }),
    email: varchar("email", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    phoneIdx: uniqueIndex("customers_phone_idx").on(t.phone),
  }),
);

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }),
    street: varchar("street", { length: 300 }).notNull(),
    apartment: varchar("apartment", { length: 50 }),
    comment: text("comment"),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => ({
    defaultUniq: uniqueIndex("customer_addresses_default_uniq")
      .on(t.customerId)
      .where(sql`${t.isDefault} = true`),
  }),
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    phoneIdx: index("otp_codes_phone_idx").on(t.phone),
  }),
);

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("favorites_customer_product_idx").on(t.customerId, t.productId),
  }),
);

// --- Orders ---

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: varchar("number", { length: 20 }).notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethod("payment_method").notNull(),
    deliveryMethod: deliveryMethod("delivery_method").notNull(),
    deliveryAddress: text("delivery_address"),
    deliveryCostTiyin: bigint("delivery_cost_tiyin", { mode: "number" }).notNull().default(0),
    subtotalTiyin: bigint("subtotal_tiyin", { mode: "number" }).notNull(),
    discountTiyin: bigint("discount_tiyin", { mode: "number" }).notNull().default(0),
    totalTiyin: bigint("total_tiyin", { mode: "number" }).notNull(),
    promoCode: varchar("promo_code", { length: 64 }),
    comment: text("comment"),
    telegramMessageId: bigint("telegram_message_id", { mode: "number" }),
    acceptedByManager: varchar("accepted_by_manager", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    numberIdx: uniqueIndex("orders_number_idx").on(t.number),
    statusIdx: index("orders_status_idx").on(t.status),
    createdIdx: index("orders_created_idx").on(t.createdAt),
    phoneIdx: index("orders_phone_idx").on(t.customerPhone),
  }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id),
    productName: varchar("product_name", { length: 300 }).notNull(),
    sku: varchar("sku", { length: 64 }).notNull(),
    quantity: integer("quantity").notNull(),
    priceTiyin: bigint("price_tiyin", { mode: "number" }).notNull(),
    totalTiyin: bigint("total_tiyin", { mode: "number" }).notNull(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
  }),
);

// --- Payments ---

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id),
    provider: varchar("provider", { length: 32 }).notNull(), // payme | click
    providerTxId: varchar("provider_tx_id", { length: 128 }),
    amountTiyin: bigint("amount_tiyin", { mode: "number" }).notNull(),
    status: varchar("status", { length: 32 }).notNull(), // created|paid|cancelled|refunded
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("payment_tx_order_idx").on(t.orderId),
    providerIdx: index("payment_tx_provider_idx").on(t.provider, t.providerTxId),
  }),
);

// --- Promo codes ---

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    discountPercent: integer("discount_percent"),
    discountTiyin: bigint("discount_tiyin", { mode: "number" }),
    minOrderTiyin: bigint("min_order_tiyin", { mode: "number" }).notNull().default(0),
    usageLimit: integer("usage_limit"),
    usageCount: integer("usage_count").notNull().default(0),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => ({
    codeIdx: uniqueIndex("promo_codes_code_idx").on(t.code),
  }),
);

// --- Bitrix mapping & sync ---

export const bitrixIdMap = pgTable(
  "bitrix_id_map",
  {
    id: serial("id").primaryKey(),
    entity: varchar("entity", { length: 32 }).notNull(), // product|category|customer|order
    siteId: integer("site_id").notNull(),
    bitrixId: varchar("bitrix_id", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("bitrix_map_entity_site_idx").on(t.entity, t.siteId),
    bitrixIdx: index("bitrix_map_entity_bitrix_idx").on(t.entity, t.bitrixId),
  }),
);

export const syncLog = pgTable(
  "sync_log",
  {
    id: serial("id").primaryKey(),
    direction: syncDirection("direction").notNull(),
    entity: varchar("entity", { length: 32 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    status: syncStatus("status").notNull(),
    error: text("error"),
    durationMs: integer("duration_ms"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index("sync_log_created_idx").on(t.createdAt),
    statusIdx: index("sync_log_status_idx").on(t.status),
  }),
);

export const outboundQueue = pgTable(
  "outbound_queue",
  {
    id: serial("id").primaryKey(),
    kind: varchar("kind", { length: 32 }).notNull(), // bitrix_order|telegram_order|sms
    payload: jsonb("payload").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pendingIdx: index("outbound_queue_pending_idx").on(t.completedAt, t.nextAttemptAt),
  }),
);

// --- Settings ---

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
