import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { brandLines, categories, products } from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = postgres(url, { max: 1, ssl: "require" });
const db = drizzle(sql, { schema });

async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    throw new Error(
      "Refusing to seed in production. Set ALLOW_SEED=1 to override (destroys existing catalog data).",
    );
  }
  console.log("Wiping catalog tables...");
  await sql`TRUNCATE TABLE products, brand_lines, categories, order_items, orders, favorites, payment_transactions RESTART IDENTITY CASCADE`;

  console.log("Seeding categories...");
  const cats = await db
    .insert(categories)
    .values([
      { slug: "hair", name: "Уход за волосами", sortOrder: 1 },
      { slug: "face", name: "Уход за лицом", sortOrder: 2 },
      { slug: "body", name: "Уход за телом", sortOrder: 3 },
      { slug: "sets", name: "Наборы и подарки", sortOrder: 4 },
    ])
    .returning();

  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

  console.log("Seeding brand lines...");
  const lines = await db
    .insert(brandLines)
    .values([
      { slug: "hydra", name: "GADE Hydra", description: "Увлажнение и восстановление" },
      { slug: "repair", name: "GADE Repair", description: "Глубокое восстановление" },
      { slug: "color", name: "GADE Color Care", description: "Защита цвета" },
      { slug: "pure", name: "GADE Pure", description: "Для чувствительной кожи" },
      { slug: "vanilla-black", name: "Vanilla Black", description: "Тёплый шлейф ванили — мист, крем и гель для душа" },
    ])
    .returning();
  const lineBySlug = Object.fromEntries(lines.map((l) => [l.slug, l]));

  console.log("Seeding products...");
  const items = [
    ["gade-hydra-shampoo-250", "HYD-SH-250", "GADE Hydra Shampoo", "hair", "hydra", "250 мл", 18_500_00, null, 42, true],
    ["gade-hydra-shampoo-1000", "HYD-SH-1000", "GADE Hydra Shampoo", "hair", "hydra", "1000 мл", 46_000_00, 52_000_00, 12, false],
    ["gade-hydra-conditioner-250", "HYD-CN-250", "GADE Hydra Conditioner", "hair", "hydra", "250 мл", 21_000_00, null, 28, true],
    ["gade-hydra-mask-200", "HYD-MK-200", "GADE Hydra Mask", "hair", "hydra", "200 мл", 24_000_00, null, 8, false],
    ["gade-repair-shampoo-250", "REP-SH-250", "GADE Repair Shampoo", "hair", "repair", "250 мл", 22_500_00, null, 35, true],
    ["gade-repair-mask-200", "REP-MK-200", "GADE Repair Mask", "hair", "repair", "200 мл", 28_000_00, 32_000_00, 15, true],
    ["gade-repair-serum-100", "REP-SR-100", "GADE Repair Serum", "hair", "repair", "100 мл", 35_000_00, null, 6, false],
    ["gade-color-shampoo-250", "COL-SH-250", "GADE Color Care Shampoo", "hair", "color", "250 мл", 24_000_00, null, 22, false],
    ["gade-color-conditioner-250", "COL-CN-250", "GADE Color Care Conditioner", "hair", "color", "250 мл", 26_000_00, null, 18, false],
    ["gade-color-mask-200", "COL-MK-200", "GADE Color Care Mask", "hair", "color", "200 мл", 29_000_00, 34_000_00, 0, false],
    ["gade-pure-cleanser-150", "PUR-CL-150", "GADE Pure Cleanser", "face", "pure", "150 мл", 19_000_00, null, 30, true],
    ["gade-pure-tonic-200", "PUR-TN-200", "GADE Pure Tonic", "face", "pure", "200 мл", 22_000_00, null, 24, false],
    ["gade-pure-cream-50", "PUR-CR-50", "GADE Pure Cream", "face", "pure", "50 мл", 45_000_00, null, 14, true],
    ["gade-pure-serum-30", "PUR-SR-30", "GADE Pure Serum", "face", "pure", "30 мл", 62_000_00, 74_000_00, 9, false],
    ["gade-hydra-body-lotion-300", "HYD-BL-300", "GADE Hydra Body Lotion", "body", "hydra", "300 мл", 26_000_00, null, 20, false],
    ["gade-repair-body-oil-100", "REP-BO-100", "GADE Repair Body Oil", "body", "repair", "100 мл", 42_000_00, null, 11, true],
    ["gade-set-hair-duo", "SET-HR-DUO", "Набор GADE Hair Duo", "sets", "hydra", "Набор", 38_000_00, 46_500_00, 15, true],
    ["gade-set-repair-trio", "SET-RP-TRIO", "Набор GADE Repair Trio", "sets", "repair", "Набор", 78_000_00, 95_000_00, 7, true],
    ["gade-set-face-basic", "SET-FC-BSC", "Набор GADE Face Basic", "sets", "pure", "Набор", 82_000_00, null, 10, false],
    ["gade-set-gift-luxe", "SET-GFT-LUX", "Подарочный набор GADE Luxe", "sets", "repair", "Набор", 145_000_00, 175_000_00, 4, true],
    ["vanilla-black-body-mist-200", "VB-MST-200", "Vanilla Black Body Mist", "body", "vanilla-black", "200 мл", 24_000_00, 32_000_00, 40, true],
    ["vanilla-black-body-cream-250", "VB-CRM-250", "Vanilla Black Body Cream", "body", "vanilla-black", "250 мл", 28_000_00, 36_000_00, 32, true],
    ["vanilla-black-shower-gel-300", "VB-SHG-300", "Vanilla Black Shower Gel", "body", "vanilla-black", "300 мл", 22_000_00, 28_000_00, 45, true],
    ["vanilla-black-set-trio", "VB-SET-TRIO", "Набор Vanilla Black Trio", "sets", "vanilla-black", "Набор", 62_000_00, 84_000_00, 18, true],
  ] as const;

  await db.insert(products).values(
    items.map(([slug, sku, name, catSlug, lineSlug, volume, price, oldPrice, stock, featured]) => {
      const cat = catBySlug[catSlug];
      const line = lineBySlug[lineSlug];
      return {
        slug,
        sku,
        name,
        categoryId: cat?.id,
        brandLineId: line?.id,
        volume,
        priceTiyin: price,
        oldPriceTiyin: oldPrice,
        stock,
        isFeatured: featured,
        isNew: stock > 30,
        description:
          "Профессиональный продукт GADE — используется в лучших салонах Ташкента. Формула разработана для ежедневного ухода и салонных процедур.",
        ingredients: "Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, Panthenol, Parfum.",
        usage: "Нанести на влажные волосы, вспенить, оставить на 1–2 минуты, тщательно смыть.",
        hairType: catSlug === "hair" ? "все типы волос" : null,
        skinType: catSlug === "face" ? "все типы кожи" : null,
        images: [],
      };
    }),
  );

  console.log(`Done. Inserted ${items.length} products.`);
  await sql.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
