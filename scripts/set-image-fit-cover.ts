import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/db/client";
import { products } from "../src/db/schema";

const NAMES = [
  "%French Lee%",
  "Спонж х8",
  "Спонж x8",
  "Парфюм Roses",
  "Парфюм Pearl",
  "Крем Skinfinity",
  "%Icon Veil%",
  "%Idyllic Brown%",
  "%Gold Premium Global%",
  "%Coco Vanille%",
  "%Selfie 27%",
];

async function main() {
  const apply = process.argv.includes("--apply");

  const conds = NAMES.map((n) => ilike(products.name, n.includes("%") ? n : n));
  const orCond = or(...conds);
  if (!orCond) throw new Error("no conditions");

  const matches = await db
    .select({ id: products.id, name: products.name, imageFit: products.imageFit })
    .from(products)
    .where(orCond);

  console.log(`Found ${matches.length} matches:`);
  for (const m of matches) {
    console.log(`  #${m.id} [${m.imageFit}] ${m.name}`);
  }

  if (!apply) {
    console.log("\nDry-run. Pass --apply to update.");
    return;
  }

  for (const m of matches) {
    await db
      .update(products)
      .set({ imageFit: "cover" })
      .where(eq(products.id, m.id));
  }
  console.log(`\nUpdated ${matches.length} products → imageFit='cover'`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
