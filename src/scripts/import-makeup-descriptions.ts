import * as fs from "fs";
import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, ilike, inArray, isNull, or } from "drizzle-orm";

const HTML_PATH = "/Users/dovudjurayev/Downloads/Chat Export/1/messages.html";

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

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function parse(html: string): Parsed[] {
  const out: Parsed[] = [];
  // Каждый товар — <div class="text">\n<strong>NAME</strong><br><br>DESC<br><br><strong>Цена: X UZS</strong>\n</div>
  const re = /<div class="text">\s*<strong>([^<]+)<\/strong>([\s\S]*?)<strong>Цена:[^<]*<\/strong>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const rawName = m[1]!.trim();
    const rawBody = m[2]!;
    const description = stripHtml(rawBody);
    if (!rawName || !description) continue;
    out.push({ name: rawName, description });
  }
  return out;
}

async function main() {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const parsed = parse(html);
  console.log(`Parsed ${parsed.length} product blocks from HTML`);

  // Берём категорию Макияж и все её подкатегории
  const rootCat = await db.query.categories.findFirst({
    where: eq(categories.slug, "makiyazh"),
  });
  if (!rootCat) throw new Error("Category makiyazh not found");

  // все под-категории (одно- и двухуровневые)
  const allCats = await db.select({ id: categories.id }).from(categories);
  const kids = new Set<number>([rootCat.id]);
  // одноуровневая иерархия достаточна
  for (const c of await db.select({ id: categories.id, parentId: categories.parentId }).from(categories)) {
    if (c.parentId && kids.has(c.parentId)) kids.add(c.id);
  }
  // второй проход для внуков
  for (const c of await db.select({ id: categories.id, parentId: categories.parentId }).from(categories)) {
    if (c.parentId && kids.has(c.parentId)) kids.add(c.id);
  }
  void allCats;
  const catIds = Array.from(kids);
  console.log(`Makeup category tree: ${catIds.length} categories`);

  // Загрузим все товары этих категорий
  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(inArray(products.categoryId, catIds), isNull(products.deletedAt)));

  const byNorm = new Map<string, { id: number; name: string }>();
  for (const r of rows) byNorm.set(norm(r.name), r);
  console.log(`Loaded ${rows.length} makeup products from DB`);

  let updated = 0;
  const missing: string[] = [];
  for (const p of parsed) {
    const key = norm(p.name);
    const target = byNorm.get(key);
    if (!target) {
      missing.push(p.name);
      continue;
    }
    await db
      .update(products)
      .set({ description: p.description, updatedAt: new Date() })
      .where(eq(products.id, target.id));
    updated++;
    console.log(`✓ #${target.id}  ${target.name}`);
  }

  console.log(`\nUpdated: ${updated}`);
  console.log(`Not found in DB (skipped): ${missing.length}`);
  for (const m of missing) console.log(`  · ${m}`);

  // Диагностика неиспользованного: строгий match потерять нельзя.
  void or; void ilike;
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
