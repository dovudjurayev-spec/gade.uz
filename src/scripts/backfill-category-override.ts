import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";

// Для всех товаров, чья категория — НЕ корневая (parentId != null),
// выставляем category_manual_override = true. Это защищает нашу ручную
// раскладку от перезаписи при следующем Billz-синке.
async function main() {
  const rootIds = await db
    .select({ id: categories.id })
    .from(categories)
    .where(isNull(categories.parentId));
  const rootIdList = rootIds.map((r) => r.id);
  const nonRootCatIds = (
    await db.select({ id: categories.id }).from(categories).where(isNotNull(categories.parentId))
  ).map((c) => c.id);

  if (nonRootCatIds.length === 0) { console.log("No non-root categories"); return; }

  const res = await db
    .update(products)
    .set({ categoryManualOverride: true, updatedAt: new Date() })
    .where(
      and(
        inArray(products.categoryId, nonRootCatIds),
        eq(products.categoryManualOverride, false),
        isNull(products.deletedAt),
      ),
    )
    .returning({ id: products.id });
  console.log(`Flag set on ${res.length} products (assigned to L2/L3).`);
  console.log(`Root categories (id): ${rootIdList.join(", ")} — not flagged.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
