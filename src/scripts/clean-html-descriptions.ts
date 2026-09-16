import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";

// Находит товары, у которых описание случайно затянуло HTML-разметку
// из экспорта Telegram (bot_button, message default, div class="text" и т. п.),
// вырезает полезный текст и заменяет описание чистой версией.

const CATEGORY_FALLBACK: Record<string, (name: string) => string> = {
  "teni-mkj-15": (n) =>
    `${n} — стойкие тени GA-DE с плотной пигментацией. Ровно ложатся на веко, хорошо растушёвываются и держатся в течение дня без осыпания.`,
  "podvodka-mkj-16": (n) =>
    `${n} — подводка GA-DE со стойкой водостойкой формулой. Тонкий аппликатор позволяет провести чёткую линию любой толщины и создать выразительную стрелку.`,
};

const GENERIC = (n: string) =>
  `${n} — оригинальный продукт GA-DE. Проверенная формула бренда с продуманным составом и стабильным результатом при регулярном использовании.`;

function extractText(html: string): string | null {
  // Пытаемся вытащить содержимое последнего <div class="text">...</div>
  const m = html.match(/<div\s+class="text">([\s\S]*?)<\/div>\s*$/i);
  if (!m) return null;
  let t = m[1] ?? "";
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.length > 20 ? t : null;
}

function looksMatching(text: string, name: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter((w) => w.length > 3);
  const nameTokens = new Set(norm(name));
  const textTokens = norm(text);
  let hit = 0;
  for (const t of textTokens) if (nameTokens.has(t)) hit++;
  return hit >= 1;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      catSlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isVisible, true),
        isNull(products.deletedAt),
        or(
          ilike(products.description, "%ShowTextCopied%"),
          ilike(products.description, "%bot_button%"),
          ilike(products.description, "%<table class=%"),
          ilike(products.description, "%message default%"),
        ),
      ),
    );

  console.log(`Found ${rows.length} polluted descriptions.\n`);
  for (const r of rows) {
    const extracted = extractText(r.description ?? "");
    let next: string;
    let source: string;
    if (extracted && looksMatching(extracted, r.name)) {
      next = extracted;
      source = "extracted";
    } else {
      const slug = r.catSlug ?? "";
      next = (CATEGORY_FALLBACK[slug] ?? GENERIC)(r.name);
      source = extracted ? "fallback (extracted text didn't match name)" : "fallback (no text block)";
    }
    console.log(`#${r.id}  ${r.name}  [${source}]`);
    console.log(`  new: ${next}\n`);
    if (apply) {
      await db.update(products).set({ description: next, updatedAt: new Date() }).where(eq(products.id, r.id));
    }
  }
  console.log(apply ? `Updated ${rows.length} products.` : `Dry-run. Re-run with --apply to persist.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
