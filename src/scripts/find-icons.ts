import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, ilike, isNull, or } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({ id: products.id, name: products.name, images: products.images })
    .from(products)
    .where(
      and(
        isNull(products.deletedAt),
        or(ilike(products.name, "%Icon Veil%"), ilike(products.name, "%Icon Roses%"), ilike(products.name, "%Roses%"))!,
      ),
    );
  for (const r of rows) {
    console.log(`#${r.id}  ${r.name}`);
    for (const img of r.images ?? []) console.log(`   ${img}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
