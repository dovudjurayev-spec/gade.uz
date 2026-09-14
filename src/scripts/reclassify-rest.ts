import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

// Раскладываем товары, привязанные напрямую к корневым L1-категориям
// (уход за лицом / телом, ногти, парфюмерия, аксессуары), по подходящим L2/L3.
// Все правила работают по нижнему регистру, без \b (в JS \b ломается на кириллице).

type Rule = { match: (n: string) => boolean; slug: string; note: string };
const has = (n: string, ...s: string[]) => s.some((x) => n.includes(x));

const RULES_BY_ROOT: Record<string, Rule[]> = {
  // ---------- УХОД ЗА ЛИЦОМ ----------
  "uhod-za-litsom": [
    { match: (n) => n.includes("маска"), slug: "maska", note: "Маска" },
    { match: (n) => has(n, "серум", "сыворотк", "масло", "serum", "hydra sublim pomegranate"), slug: "masla-i-syvorotki", note: "Масла и сыворотки" },
    { match: (n) => has(n, "тоник", "мицелляр", "пенка", "мусс", "смывка", "скраб", "гель для", "гель ", "салфетк"), slug: "ochischenie", note: "Очищение" },
    { match: (n) => has(n, "крем для глаз", "eye serum", "aqua jolt eye", "hydra sublim royal pomegranate eye"), slug: "glaza-l3-25", note: "Крем для глаз" },
    { match: (n) => has(n, "ночн") || n.includes("night"), slug: "noch-l3-25", note: "Крем ночной" },
    { match: (n) => has(n, "дневной", "дневная") || n.includes("day"), slug: "dnevnoi-l3-25", note: "Крем дневной" },
    { match: (n) => n.includes("10ml") || n.includes("мини"), slug: "mini-obem-l3-25", note: "Крем мини объём" },
    { match: (n) => n.includes("крем"), slug: "krem", note: "Крем" },
  ],

  // ---------- УХОД ЗА ТЕЛОМ ----------
  "uhod-za-telom": [
    { match: (n) => has(n, "боди мист", "body mist", "спрей"), slug: "sprey-dlya-tela", note: "Спрей / мист для тела" },
    { match: (n) => has(n, "лосьон"), slug: "losyon-dlya-tela", note: "Лосьон для тела" },
    { match: (n) => n.includes("дезодорант"), slug: "dezodorant", note: "Дезодорант" },
    { match: (n) => n.includes("крем для рук"), slug: "krem-dlya-ruk-uhod-za-telom", note: "Крем для рук" },
  ],

  // ---------- НОГТИ ----------
  "nogti": [
    {
      match: (n) =>
        has(n, "top coat", "gel", "nail hardener", "advanced strengthener", "праймер", "сушка", "уход", "proffecional gel", "professional gel"),
      slug: "uhod-za-nogtyami",
      note: "Уход за ногтями",
    },
    { match: () => true, slug: "lak", note: "Лак" }, // всё остальное — просто «Лак»
  ],

  // ---------- ПАРФЮМЕРИЯ ----------
  "parfyumeriya": [
    { match: (n) => has(n, "подарочн", "gift", "набор"), slug: "podarochnye-nabory-parfyum", note: "Подарочный набор" },
    // По умолчанию — женская парфюмерия (у GA-DE вся линейка женская).
    { match: () => true, slug: "parfyum-zhenskiy", note: "Женская парфюмерия" },
  ],

  // ---------- АКСЕССУАРЫ ----------
  "aksessuary": [
    { match: (n) => n.includes("косметичк"), slug: "kosmetichka", note: "Косметичка" },
    { match: (n) => n.includes("кисть") || n.includes("кисти"), slug: "kisti", note: "Кисти" },
    { match: (n) => n.includes("спонж"), slug: "sponzhi", note: "Спонжи" },
    { match: (n) => n.includes("точилк"), slug: "tochilka", note: "Точилка" },
    { match: (n) => n.includes("брелок"), slug: "brelok-aksessuary", note: "Брелок" },
  ],
};

async function processRoot(rootSlug: string, dryRun: boolean) {
  const root = await db.query.categories.findFirst({ where: eq(categories.slug, rootSlug) });
  if (!root) { console.log(`Root ${rootSlug} not found`); return; }
  const allCats = await db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories);
  const catBySlug = new Map(allCats.map((c) => [c.slug, c] as const));
  const rules = RULES_BY_ROOT[rootSlug] ?? [];
  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.categoryId, root.id), isNull(products.deletedAt), eq(products.isVisible, true)));
  console.log(`\n=== ${rootSlug} — ${rows.length} products on root ===`);
  let matched = 0;
  const unmatched: { id: number; name: string }[] = [];
  const byCat = new Map<string, number>();
  for (const p of rows) {
    const norm = p.name.toLowerCase().replace(/\s+/g, " ").trim();
    const rule = rules.find((r) => r.match(norm));
    if (!rule) { unmatched.push(p); continue; }
    const target = catBySlug.get(rule.slug);
    if (!target) { console.warn(`⚠ missing slug ${rule.slug}`); unmatched.push(p); continue; }
    matched++;
    byCat.set(rule.note, (byCat.get(rule.note) ?? 0) + 1);
    if (!dryRun) {
      await db.update(products).set({ categoryId: target.id, categoryManualOverride: true, updatedAt: new Date() }).where(eq(products.id, p.id));
    }
    console.log(`${dryRun ? "·" : "✓"} #${p.id}  ${p.name}  →  ${rule.note}`);
  }
  console.log(`\n${dryRun ? "[DRY-RUN] Matched" : "Updated"}: ${matched}/${rows.length}`);
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, n] of sorted) console.log(`  ${String(n).padStart(4)}  ${k}`);
  if (unmatched.length) {
    console.log(`Unmatched (${unmatched.length}):`);
    for (const u of unmatched) console.log(`  · #${u.id}  ${u.name}`);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const only = process.argv.find((a) => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]);
  const roots = only ? [only] : ["uhod-za-litsom", "uhod-za-telom", "nogti", "parfyumeriya", "aksessuary"];
  for (const r of roots) await processRoot(r, !apply);
  if (!apply) console.log(`\nRun with --apply to persist.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
