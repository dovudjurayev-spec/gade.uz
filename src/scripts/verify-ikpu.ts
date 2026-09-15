import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

async function main() {
  const rows = await db
    .select({ ikpu: products.ikpu, cnt: sql<number>`count(*)::int` })
    .from(products)
    .where(isNull(products.deletedAt))
    .groupBy(products.ikpu)
    .orderBy(sql`count(*) desc`);
  console.log("Распределение ИКПУ по товарам сейчас:");
  for (const r of rows) console.log(`  ${r.ikpu ?? "(null)"}  × ${r.cnt}`);

  // Пример: помада
  const pomada = await db
    .select({ id: products.id, name: products.name, ikpu: products.ikpu })
    .from(products)
    .where(and(eq(products.ikpu, "03304999006000000"), isNull(products.deletedAt)))
    .limit(5);
  console.log("\nПример: товары с ИКПУ помады (03304999006000000):");
  for (const p of pomada) console.log(`  #${p.id}  ${p.name}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
