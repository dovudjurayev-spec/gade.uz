import { db } from "@/db/client";
import { products, categories } from "@/db/schema";
import { and, eq, isNull, asc } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      categoryName: categories.name,
      categorySort: categories.sortOrder,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.isFeatured, true), isNull(products.deletedAt)))
    .orderBy(asc(categories.sortOrder), asc(categories.name), asc(products.name));
  for (const r of rows) {
    console.log(`cat=${r.categorySort} [${r.categoryName}] id=${r.id}  ${r.name}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
