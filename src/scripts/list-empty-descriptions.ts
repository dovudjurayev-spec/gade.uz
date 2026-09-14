import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull, or, sql, asc } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      volume: products.volume,
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
    )
    .orderBy(asc(categories.name), asc(products.name));

  console.log(JSON.stringify(rows, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
