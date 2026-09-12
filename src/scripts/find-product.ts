import { db } from "@/db/client";
import { products } from "@/db/schema";
import { or, ilike, eq } from "drizzle-orm";

async function main() {
  const q = process.argv[2] ?? "";
  const rows = await db
    .select({ id: products.id, slug: products.slug, name: products.name, images: products.images })
    .from(products)
    .where(or(ilike(products.name, `%${q}%`), ilike(products.slug, `%${q}%`), eq(products.slug, q)))
    .limit(5);
  console.log(JSON.stringify(rows, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
