import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const slug = process.argv[2] ?? "makiyazh";
  const root = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  if (!root) { console.log("not found"); return; }
  console.log("root:", root.id, root.name, "isVisible=", (root as { isVisible?: boolean }).isVisible);
  const all = await db.select().from(categories);
  const kids = all.filter((c) => c.parentId === root.id);
  console.log(`L2 count: ${kids.length}`);
  for (const k of kids) {
    console.log(`  L2 #${k.id}  ${k.name}  slug=${k.slug}  vis=${(k as { isVisible?: boolean }).isVisible}`);
    const l3 = all.filter((c) => c.parentId === k.id);
    for (const c of l3) console.log(`     L3 #${c.id}  ${c.name}  slug=${c.slug}  vis=${(c as { isVisible?: boolean }).isVisible}`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
