/**
 * Cleanup script: removes leftover seed/demo data from the catalog.
 *
 * Deletes:
 *   - products where billz_id IS NULL   (i.e. never came from BILLZ)
 *   - brand_lines with no remaining products
 *   - categories with no remaining products
 *
 * BILLZ is never contacted or modified.
 *
 * Usage:
 *   npx tsx scripts/cleanup-seed-data.ts           # dry run — shows counts, no changes
 *   npx tsx scripts/cleanup-seed-data.ts --apply   # actually delete
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull, sql as dsql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { brandLines, categories, products } from "../src/db/schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const APPLY = process.argv.includes("--apply");

const sql = postgres(url, { max: 1, ssl: "require" });
const db = drizzle(sql, { schema });

async function main() {
  console.log(APPLY ? "🔴 APPLY MODE — changes will be committed" : "🟡 DRY RUN — no changes will be written");
  console.log("");

  // 1. Non-BILLZ products (seed leftovers)
  const seedProducts = await db
    .select({ id: products.id, slug: products.slug, name: products.name, sku: products.sku })
    .from(products)
    .where(isNull(products.billzId));

  console.log(`Non-BILLZ products (billz_id IS NULL): ${seedProducts.length}`);
  for (const p of seedProducts) {
    console.log(`  - [${p.id}] ${p.name} (sku=${p.sku}, slug=${p.slug})`);
  }
  console.log("");

  if (APPLY && seedProducts.length > 0) {
    const ids = seedProducts.map((p) => p.id);
    await db.delete(products).where(isNull(products.billzId));
    console.log(`  ✓ Deleted ${ids.length} products`);
  }

  // 2. Orphan brand_lines (no products point to them)
  const orphanBrands = await db
    .select({ id: brandLines.id, slug: brandLines.slug, name: brandLines.name })
    .from(brandLines)
    .where(
      dsql`NOT EXISTS (SELECT 1 FROM ${products} WHERE ${products.brandLineId} = ${brandLines.id})`,
    );

  console.log(`Orphan brand lines: ${orphanBrands.length}`);
  for (const b of orphanBrands) {
    console.log(`  - [${b.id}] ${b.name} (slug=${b.slug})`);
  }
  console.log("");

  if (APPLY && orphanBrands.length > 0) {
    for (const b of orphanBrands) {
      await db.delete(brandLines).where(eq(brandLines.id, b.id));
    }
    console.log(`  ✓ Deleted ${orphanBrands.length} brand lines`);
  }

  // 3. Orphan categories (no products point to them)
  const orphanCats = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .where(
      dsql`NOT EXISTS (SELECT 1 FROM ${products} WHERE ${products.categoryId} = ${categories.id})`,
    );

  console.log(`Orphan categories: ${orphanCats.length}`);
  for (const c of orphanCats) {
    console.log(`  - [${c.id}] ${c.name} (slug=${c.slug})`);
  }
  console.log("");

  if (APPLY && orphanCats.length > 0) {
    for (const c of orphanCats) {
      await db.delete(categories).where(eq(categories.id, c.id));
    }
    console.log(`  ✓ Deleted ${orphanCats.length} categories`);
  }

  // Sanity check: remaining catalog
  const remaining = await db
    .select({ n: dsql<number>`count(*)::int` })
    .from(products)
    .where(and(eq(products.isVisible, true), isNull(products.deletedAt)));
  console.log(`Remaining visible, non-deleted products: ${remaining[0]?.n ?? 0}`);

  if (!APPLY) {
    console.log("");
    console.log("Nothing changed. Re-run with --apply to actually delete.");
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
