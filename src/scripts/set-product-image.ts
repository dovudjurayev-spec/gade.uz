import { db } from "@/db/client";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const id = Number(process.argv[2]);
  const url = process.argv[3];
  if (!id || !url) throw new Error("usage: set-product-image <id> <url>");
  const [row] = await db
    .update(products)
    .set({ images: [url] })
    .where(eq(products.id, id))
    .returning({ id: products.id, name: products.name, images: products.images });
  console.log(JSON.stringify(row, null, 2));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
