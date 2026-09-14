import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

async function main() {
  const rootSlug = process.argv[2] ?? "makiyazh";
  const root = await db.query.categories.findFirst({ where: eq(categories.slug, rootSlug) });
  if (!root) { console.log("not found"); return; }
  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.categoryId, root.id), isNull(products.deletedAt), eq(products.isVisible, true)));
  console.log(`Products directly on root "${rootSlug}" (id=${root.id}): ${rows.length}`);
  for (const r of rows) console.log(`  #${r.id}  ${r.name}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
