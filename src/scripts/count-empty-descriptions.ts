import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isVisible, true),
        isNull(products.deletedAt),
        or(isNull(products.description), sql`btrim(${products.description}) = ''`),
      ),
    );

  const byCat = new Map<string, number>();
  for (const r of rows) {
    const key = r.categoryName ?? "(без категории)";
    byCat.set(key, (byCat.get(key) ?? 0) + 1);
  }
  console.log(`Всего товаров без описания: ${rows.length}\n`);
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, n] of sorted) {
    console.log(`${String(n).padStart(4)}  ${cat}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
