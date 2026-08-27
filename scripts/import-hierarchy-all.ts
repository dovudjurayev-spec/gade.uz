/**
 * Импорт 3-уровневой иерархии для ВСЕХ корневых категорий из Billz.
 *
 * Источники в Billz:
 *  - Уровень 1: p.categories[0].name             (например: "Уход за лицом")
 *  - Уровень 2: custom_fields.ПОДКАТЕГОРИЯ       (например: "Кремы")
 *  - Уровень 3: custom_fields.ПОД_ПОДКАТЕГОРИЯ   (например: "Дневной")
 *
 * Что делает:
 *  1. Загружает все корневые категории из БД (parent_id IS NULL).
 *  2. Проходит всех товаров Billz.
 *  3. Сопоставляет верхнюю категорию по имени (case-insensitive, с нормализацией).
 *  4. Создаёт недостающие узлы L2/L3, привязывая parent_id.
 *  5. Обновляет products.category_id на самый глубокий доступный узел.
 *
 * Флаги:
 *  --dry — только показать план (никаких INSERT/UPDATE).
 *
 * Запуск:
 *  npx tsx scripts/import-hierarchy-all.ts --dry
 *  npx tsx scripts/import-hierarchy-all.ts
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { categories, products } from "../src/db/schema";
import { fetchProductsPage, getCustomField, type BillzProduct } from "../src/lib/billz/client";

const DRY = process.argv.includes("--dry");

function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function normalizeName(input: string): string {
  return input.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
}

// Опечатки/варианты написания из Billz — приводим к каноническому виду.
const TYPO_FIXES: Record<string, string> = {
  "каранадаш": "Карандаш",
};

function canonicalize(name: string): string {
  const key = normalizeName(name).toLowerCase();
  return TYPO_FIXES[key] ?? normalizeName(name);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pg = postgres(url, { max: 1, ssl: "require" });
  const db = drizzle(pg, { schema });

  // 1. Все корневые категории
  const roots = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .where(isNull(categories.parentId));

  const rootByName = new Map<string, { id: number; slug: string; name: string }>();
  for (const r of roots) rootByName.set(normalizeName(r.name).toLowerCase(), r);
  console.log(`Корневых категорий: ${roots.length}`);
  for (const r of roots) console.log(`  - "${r.name}" #${r.id} (slug=${r.slug})`);

  // 2. Все L2/L3, сгруппированные под корни
  const allCats = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId, slug: categories.slug })
    .from(categories);

  // Быстрый маппинг: parentId -> children
  const childrenOf = new Map<number, typeof allCats>();
  for (const c of allCats) {
    if (c.parentId != null) {
      const arr = childrenOf.get(c.parentId) ?? [];
      arr.push(c);
      childrenOf.set(c.parentId, arr);
    }
  }

  // Кеш L2 по (rootId, normalizedName), L3 по (l2Id, normalizedName)
  const l2Cache = new Map<string, number>();
  const l3Cache = new Map<string, number>();
  for (const root of roots) {
    for (const l2 of childrenOf.get(root.id) ?? []) {
      l2Cache.set(`${root.id}::${normalizeName(l2.name).toLowerCase()}`, l2.id);
      for (const l3 of childrenOf.get(l2.id) ?? []) {
        l3Cache.set(`${l2.id}::${normalizeName(l3.name).toLowerCase()}`, l3.id);
      }
    }
  }
  console.log(`Существующие: L2=${l2Cache.size}, L3=${l3Cache.size}`);

  async function ensureLevel2(root: { id: number; slug: string }, name: string): Promise<number> {
    const key = `${root.id}::${normalizeName(name).toLowerCase()}`;
    const cached = l2Cache.get(key);
    if (cached) return cached;
    const slug = `${slugify(name)}-${root.slug}`.slice(0, 180);
    if (DRY) {
      console.log(`  [DRY] INSERT L2 "${name}" (slug=${slug}, parent=${root.id})`);
      const fakeId = -Math.floor(Math.random() * 1000000);
      l2Cache.set(key, fakeId);
      return fakeId;
    }
    const inserted = await db
      .insert(categories)
      .values({ slug, name: normalizeName(name), parentId: root.id })
      .returning({ id: categories.id });
    const id = inserted[0]!.id;
    l2Cache.set(key, id);
    console.log(`  + L2 "${name}" #${id} (под #${root.id})`);
    return id;
  }

  async function ensureLevel3(l2Id: number, name: string): Promise<number> {
    const key = `${l2Id}::${normalizeName(name).toLowerCase()}`;
    const cached = l3Cache.get(key);
    if (cached) return cached;
    const slug = `${slugify(name)}-l3-${l2Id}`.slice(0, 180);
    if (DRY) {
      console.log(`    [DRY] INSERT L3 "${name}" (slug=${slug}, parent=${l2Id})`);
      const fakeId = -Math.floor(Math.random() * 1000000);
      l3Cache.set(key, fakeId);
      return fakeId;
    }
    const inserted = await db
      .insert(categories)
      .values({ slug, name: normalizeName(name), parentId: l2Id })
      .returning({ id: categories.id });
    const id = inserted[0]!.id;
    l3Cache.set(key, id);
    console.log(`    + L3 "${name}" #${id} (под #${l2Id})`);
    return id;
  }

  // 3. Пройти все Billz-товары
  const PAGE = 100;
  let page = 1;
  let total = Infinity;
  let scanned = 0;
  let matched = 0;
  let skippedNoRoot = 0;
  const reassignPlan: { billzId: string; targetCategoryId: number }[] = [];
  const unmatchedTops = new Map<string, number>();

  while ((page - 1) * PAGE < total) {
    const resp = await fetchProductsPage(page, PAGE);
    total = resp.count;
    for (const p of resp.products as BillzProduct[]) {
      scanned++;
      const top = p.categories?.[0]?.name;
      if (!top) continue;
      const root = rootByName.get(normalizeName(top).toLowerCase());
      if (!root) {
        skippedNoRoot++;
        unmatchedTops.set(top, (unmatchedTops.get(top) ?? 0) + 1);
        continue;
      }
      matched++;

      const l2Raw = getCustomField(p, "ПОДКАТЕГОРИЯ");
      const l3Raw = getCustomField(p, "ПОД_ПОДКАТЕГОРИЯ");
      const l2Name = l2Raw ? canonicalize(l2Raw) : null;
      const l3Name = l3Raw ? canonicalize(l3Raw) : null;

      if (!l2Name) continue;
      const l2Id = await ensureLevel2(root, l2Name);
      let target = l2Id;
      if (l3Name) target = await ensureLevel3(l2Id, l3Name);
      reassignPlan.push({ billzId: p.id, targetCategoryId: target });
    }
    if (resp.products.length < PAGE) break;
    page++;
  }
  console.log(
    `\nПросмотрено: ${scanned}, совпало с корнем: ${matched}, ` +
    `без совпадения: ${skippedNoRoot}, план переназначений: ${reassignPlan.length}`,
  );

  if (unmatchedTops.size > 0) {
    console.log(`\nВерхние категории Billz без соответствия в БД:`);
    for (const [name, count] of [...unmatchedTops.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  "${name}" — ${count} товаров`);
    }
  }

  // 4. Обновить products.category_id
  let updated = 0;
  for (const step of reassignPlan) {
    if (DRY) continue;
    const res = await db
      .update(products)
      .set({ categoryId: step.targetCategoryId, updatedAt: new Date() })
      .where(eq(products.billzId, step.billzId))
      .returning({ id: products.id });
    if (res[0]) updated++;
  }

  console.log(`\nИтого:`);
  console.log(`  L2: ${l2Cache.size}`);
  console.log(`  L3: ${l3Cache.size}`);
  console.log(`  Обновлено товаров: ${updated}${DRY ? " (DRY)" : ""}`);

  await pg.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
