/**
 * Read-only audit: shows all categories, product counts, and sample product names.
 * Helps decide which categories are real vs junk from BILLZ.
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, isNull, sql as dsql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { categories, products } from "../src/db/schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = postgres(url, { max: 1, ssl: "require" });
const db = drizzle(sql, { schema });

async function main() {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      isVisible: categories.isVisible,
      total: dsql<number>`count(${products.id})::int`,
      visible: dsql<number>`count(*) FILTER (WHERE ${products.isVisible} = true AND ${products.deletedAt} IS NULL)::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(desc(dsql`count(${products.id})`));

  console.log(`Total categories: ${rows.length}`);
  console.log("");
  console.log("id  | visible | total | slug                          | name");
  console.log("----+---------+-------+-------------------------------+----------------------------");
  for (const r of rows) {
    const flag = r.isVisible ? " " : "H";
    console.log(
      `${String(r.id).padStart(3)} ${flag}| ${String(r.visible).padStart(7)} | ${String(r.total).padStart(5)} | ${r.slug.padEnd(30)}| ${r.name}`,
    );
  }

  console.log("");
  console.log("=== SAMPLE PRODUCTS PER CATEGORY (up to 5 each) ===");
  for (const r of rows) {
    const samples = await db
      .select({ name: products.name, sku: products.sku })
      .from(products)
      .where(
        and(
          eq(products.categoryId, r.id),
          eq(products.isVisible, true),
          isNull(products.deletedAt),
        ),
      )
      .limit(5);
    if (samples.length === 0) continue;
    console.log("");
    console.log(`[${r.name}] (${r.visible} visible products, slug=${r.slug}):`);
    for (const s of samples) console.log(`  - ${s.name}  (sku=${s.sku})`);
  }

  // Products with no category
  const noCat = await db
    .select({ n: dsql<number>`count(*)::int` })
    .from(products)
    .where(
      and(
        isNull(products.categoryId),
        eq(products.isVisible, true),
        isNull(products.deletedAt),
      ),
    );
  console.log("");
  console.log(`Products with no category (visible): ${noCat[0]?.n ?? 0}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
