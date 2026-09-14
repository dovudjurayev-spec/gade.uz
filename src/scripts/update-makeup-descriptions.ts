import { readFileSync } from "fs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";

type Item = { name: string; desc: string };

function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

async function main() {
  const items: Item[] = JSON.parse(readFileSync("/tmp/makeup-extract.json", "utf8"));

  // Dedup by name — keep first occurrence
  const byName = new Map<string, string>();
  for (const it of items) {
    if (!byName.has(normalize(it.name))) byName.set(normalize(it.name), it.desc);
  }

  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.categoryId, 6), isNull(products.deletedAt)));

  const dbByNorm = new Map<string, { id: number; name: string }>();
  for (const r of rows) dbByNorm.set(normalize(r.name), r);

  let matched = 0;
  let missed = 0;
  const misses: string[] = [];

  for (const [normName, desc] of byName) {
    const hit = dbByNorm.get(normName);
    if (!hit) { misses.push(normName); missed++; continue; }
    await db
      .update(products)
      .set({ description: desc, updatedAt: new Date() })
      .where(eq(products.id, hit.id));
    console.log(`OK  ${hit.id}  ${hit.name}`);
    matched++;
  }

  console.log(`\nMATCHED: ${matched}  MISSED: ${missed}`);
  if (misses.length) {
    console.log("\nMISSES (no exact DB match):");
    for (const m of misses) console.log("  -", m);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
