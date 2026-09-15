import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

// Смотрим что реально лежит под каждым ИКПУ — ищем «протечки»:
// товары не по своему коду.
async function main() {
  const groups = await db
    .select({ ikpu: products.ikpu, cnt: sql<number>`count(*)::int` })
    .from(products)
    .where(isNull(products.deletedAt))
    .groupBy(products.ikpu)
    .orderBy(sql`count(*) desc`);

  for (const g of groups) {
    if (!g.ikpu) continue;
    const sample = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.ikpu, g.ikpu), isNull(products.deletedAt)))
      .orderBy(sql`random()`)
      .limit(8);
    console.log(`\n${g.ikpu}  (× ${g.cnt})`);
    for (const s of sample) console.log(`   ${s.name}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
