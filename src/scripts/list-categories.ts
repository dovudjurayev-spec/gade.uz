import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { sql, eq, isNotNull } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      count: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, sql`${products.categoryId} = ${categories.id} AND ${products.isVisible} = true AND ${products.deletedAt} IS NULL`)
    .groupBy(categories.id, categories.slug, categories.name)
    .orderBy(sql`count(${products.id}) desc`);
  for (const r of rows) console.log(`${String(r.count).padStart(4)}  ${r.slug.padEnd(28)}  ${r.name}`);
  const uncat = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(sql`${products.categoryId} IS NULL AND ${products.isVisible} = true AND ${products.deletedAt} IS NULL`);
  console.log(`\nUncategorized: ${uncat[0]?.n ?? 0}`);
}
main().then(() => process.exit(0));
