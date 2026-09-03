import "dotenv/config";
import { and, eq, isNull, or, sql, inArray } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { products } from "../src/db/schema";

// Каждая позиция: набор AND-ключевых слов (ILIKE). Порядок важен: если несколько
// матчей — берём первый в отсортированном по id.
const TARGETS: { label: string; keywords: string[] }[] = [
  { label: "Карандаш пудровый брови 60", keywords: ["карандаш", "пудров", "бров", "60"] },
  { label: "Карандаш Everlasting для губ 82", keywords: ["everlasting", "губ", "82"] },
  { label: "Карандаш Everlasting для глаз 303", keywords: ["everlasting", "глаз", "303"] },
  { label: "Пудра с зеркалом Idyllic New 20", keywords: ["idyllic", "пудра", "20"] },
  { label: "Тональный Longevity 501", keywords: ["longevity", "501"] },
  { label: "Тушь Idyllic Brown", keywords: ["idyllic", "тушь", "brown"] },
  { label: "Блеск Crystal Lights 805", keywords: ["crystal", "805"] },
  { label: "Gold Premium Double Serum", keywords: ["gold", "premium", "double", "serum"] },
];

const APPLY = process.argv.includes("--apply");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pg = postgres(url, { max: 1, ssl: "require" });
  const db = drizzle(pg, { schema });

  const chosenIds: number[] = [];

  for (const t of TARGETS) {
    const conds = t.keywords.map((k) => sql`${products.name} ILIKE ${"%" + k + "%"}`);
    const rows = await db
      .select({ id: products.id, name: products.name, isFeatured: products.isFeatured })
      .from(products)
      .where(and(isNull(products.deletedAt), ...conds))
      .orderBy(products.id)
      .limit(10);

    console.log(`\n▸ ${t.label}  [${t.keywords.join(" + ")}]`);
    if (rows.length === 0) {
      console.log("   ✗ ничего не найдено");
      continue;
    }
    rows.forEach((r, i) => {
      const mark = i === 0 ? "★" : " ";
      console.log(`   ${mark} #${r.id}  ${r.name}${r.isFeatured ? "  (уже хит)" : ""}`);
    });
    const first = rows[0];
    if (first) chosenIds.push(first.id);
  }

  console.log(`\nВыбрано товаров: ${chosenIds.length} / ${TARGETS.length}`);

  if (!APPLY) {
    console.log("Dry-run. Для применения запусти с --apply");
    await pg.end({ timeout: 5 });
    return;
  }

  await db.update(products).set({ isFeatured: false }).where(eq(products.isFeatured, true));
  if (chosenIds.length > 0) {
    await db.update(products).set({ isFeatured: true }).where(inArray(products.id, chosenIds));
  }
  console.log(`\n✓ isFeatured сброшен у всех, установлен у ${chosenIds.length} товаров.`);

  await pg.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
