import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

async function main() {
  const FALLBACK_IKPU = [
    "03304999008000000",
    "03304011003000000",
    "03304011006000000",
    "09616002003000000",
    "03303001001000000",
    "03304007001000000",
  ];

  for (const ikpu of FALLBACK_IKPU) {
    const rows = await db
      .select({ id: products.id, name: products.name, categoryId: products.categoryId })
      .from(products)
      .where(and(eq(products.ikpu, ikpu), isNull(products.deletedAt)))
      .limit(40);
    console.log(`\n===== ${ikpu} =====`);
    for (const r of rows) console.log(`  #${r.id}  cat=${r.categoryId}  ${r.name}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
