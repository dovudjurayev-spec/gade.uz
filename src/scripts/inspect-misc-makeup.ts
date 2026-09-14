import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

async function main() {
  const parent = alias(categories, "parent_cat");
  const grand = alias(categories, "grand_cat");
  const names = [
    "Essentials Праймер для век",
    "Metallic 100",
    "База защищающая SPF 30",
    "База под макияж",
  ];
  for (const n of names) {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        catId: products.categoryId,
        catName: categories.name,
        parentId: categories.parentId,
        parentName: parent.name,
        parentParentId: parent.parentId,
        grandName: grand.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(parent, eq(categories.parentId, parent.id))
      .leftJoin(grand, eq(parent.parentId, grand.id))
      .where(and(ilike(products.name, `%${n}%`), isNull(products.deletedAt)))
      .limit(3);
    for (const r of rows) {
      console.log(`#${r.id} ${r.name}`);
      console.log(`  leaf: ${r.catId} ${r.catName}  parent=${r.parentId} ${r.parentName}  grand=${r.parentParentId} ${r.grandName}`);
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
