import * as fs from "fs";
import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

type Parsed = { name: string; description: string };

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Точечные фиксы текстовых опечаток, встречающихся в экспортах Telegram-бота.
function fixTextErrors(s: string): string {
  return s
    // Слитные слова из-за потери разделителя «\» при экспорте.
    .replace(/нормальной\s*[\\/]?\s*сухой/gi, "нормальной и сухой")
    .replace(/нормальнойсухой/gi, "нормальной и сухой")
    .replace(/жирной\s*[\\/]?\s*комб(инированной)?/gi, "жирной и комбинированной")
    .replace(/жирнойкомб(инированной)?/gi, "жирной и комбинированной")
    // Двойные пробелы и артефакты.
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

function norm(s: string): string {
  return fixTextErrors(s)
    .replace(/[\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parse(html: string): Parsed[] {
  const out: Parsed[] = [];
  const re = /<div class="text">\s*<strong>([^<]+)<\/strong>([\s\S]*?)<strong>Цена:[^<]*<\/strong>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const rawName = stripHtml(m[1]!);
    const description = stripHtml(m[2]!);
    if (!rawName || !description) continue;
    out.push({ name: rawName, description });
  }
  return out;
}

async function collectCategoryTree(rootSlug: string): Promise<number[]> {
  const root = await db.query.categories.findFirst({ where: eq(categories.slug, rootSlug) });
  if (!root) throw new Error(`Category ${rootSlug} not found`);
  const all = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
  const kids = new Set<number>([root.id]);
  for (let pass = 0; pass < 3; pass++) {
    for (const c of all) if (c.parentId && kids.has(c.parentId)) kids.add(c.id);
  }
  return Array.from(kids);
}

async function main() {
  const htmlPath = process.argv[2];
  const rootSlug = process.argv[3];
  if (!htmlPath || !rootSlug) {
    throw new Error("usage: import-descriptions <html-path> <category-slug>");
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const parsed = parse(html);
  console.log(`Parsed ${parsed.length} product blocks from ${htmlPath}`);

  const catIds = await collectCategoryTree(rootSlug);
  console.log(`Category tree "${rootSlug}": ${catIds.length} categories`);

  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(inArray(products.categoryId, catIds), isNull(products.deletedAt)));
  const byNorm = new Map<string, { id: number; name: string }>();
  for (const r of rows) byNorm.set(norm(r.name), r);
  console.log(`Loaded ${rows.length} products from DB`);

  let updated = 0;
  let renamed = 0;
  const missing: string[] = [];
  for (const p of parsed) {
    const target = byNorm.get(norm(p.name));
    if (!target) {
      missing.push(p.name);
      continue;
    }
    const fixedName = fixTextErrors(target.name);
    const fixedDescription = fixTextErrors(p.description);
    const patch: { description: string; updatedAt: Date; name?: string } = {
      description: fixedDescription,
      updatedAt: new Date(),
    };
    if (fixedName !== target.name) {
      patch.name = fixedName;
      renamed++;
    }
    await db.update(products).set(patch).where(eq(products.id, target.id));
    updated++;
    const tag = patch.name ? " (name fixed)" : "";
    console.log(`✓ #${target.id}  ${fixedName}${tag}`);
  }
  console.log(`\nUpdated: ${updated} (names fixed: ${renamed})`);
  console.log(`Not found in DB (skipped): ${missing.length}`);
  for (const m of missing) console.log(`  · ${m}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
