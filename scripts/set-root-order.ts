import "dotenv/config";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { categories } from "../src/db/schema";

const ORDER: { slug: string; sort: number }[] = [
  { slug: "makiyazh", sort: 1 },
  { slug: "uhod-za-litsom", sort: 2 },
  { slug: "uhod-za-telom", sort: 3 },
  { slug: "nogti", sort: 4 },
  { slug: "parfyumeriya", sort: 5 },
  { slug: "aksessuary", sort: 99 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pg = postgres(url, { max: 1, ssl: "require" });
  const db = drizzle(pg, { schema });

  for (const o of ORDER) {
    const res = await db
      .update(categories)
      .set({ sortOrder: o.sort })
      .where(eq(categories.slug, o.slug))
      .returning({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder });
    if (res[0]) console.log(`  #${res[0].id} ${res[0].name} → sort=${res[0].sortOrder}`);
    else console.warn(`  slug=${o.slug} — not found`);
  }
  await pg.end({ timeout: 5 });
}

main().catch((e) => { console.error(e); process.exit(1); });
