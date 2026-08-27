/**
 * Импорт 3-уровневой иерархии для категории "Макияж" из Billz.
 *
 * Источники в Billz:
 *  - Уровень 1: p.categories[0].name             (например: "Макияж")
 *  - Уровень 2: custom_fields.ПОДКАТЕГОРИЯ       (например: "Губы")
 *  - Уровень 3: custom_fields.ПОД_ПОДКАТЕГОРИЯ   (например: "Блеск")
 *
 * Что делает:
 *  1. Проходит всех товаров Billz.
 *  2. Отбирает те, у которых верхняя категория — "Макияж".
 *  3. Создаёт недостающие узлы уровня 2 и 3, привязывая parent_id корректно.
 *  4. Обновляет products.category_id, указывая на самый глубокий доступный узел.
 *
 * Флаги:
 *  --dry — только показать, что произошло бы (никаких INSERT/UPDATE).
 *
 * Запуск:
 *  npx tsx scripts/import-makiyazh-hierarchy.ts --dry
 *  npx tsx scripts/import-makiyazh-hierarchy.ts
 */
import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { categories, products } from "../src/db/schema";
import { fetchProductsPage, getCustomField, type BillzProduct } from "../src/lib/billz/client";

const ROOT_NAME = "Макияж";
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

// Опечатки из Billz — приводим к каноническому написанию до вставки.
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

  // 1. Root Макияж
  const rootRow = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories)
    .where(and(eq(categories.name, ROOT_NAME), isNull(categories.parentId)))
    .limit(1);
  if (!rootRow[0]) {
    console.error(`Категория "${ROOT_NAME}" не найдена в БД. Прерываю.`);
    await pg.end();
    process.exit(1);
  }
  const rootId = rootRow[0].id;
  console.log(`Root "${ROOT_NAME}" #${rootId} (slug=${rootRow[0].slug})`);

  // 2. Кеш: имя(normalized) → id, отдельно на каждый уровень
  const level2ByName = new Map<string, number>();
  const level3ByParentAndName = new Map<string, number>(); // ключ: `${parentId}::${name}`

  const existingLevel2 = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.parentId, rootId));
  for (const r of existingLevel2) level2ByName.set(normalizeName(r.name).toLowerCase(), r.id);

  const level2Ids = existingLevel2.map((r) => r.id);
  if (level2Ids.length > 0) {
    const existingLevel3 = await db
      .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
      .from(categories);
    for (const r of existingLevel3) {
      if (r.parentId != null && level2Ids.includes(r.parentId)) {
        level3ByParentAndName.set(
          `${r.parentId}::${normalizeName(r.name).toLowerCase()}`,
          r.id,
        );
      }
    }
  }

  console.log(
    `Существующие уровни: L2=${level2ByName.size}, L3=${level3ByParentAndName.size}`,
  );

  async function ensureLevel2(name: string): Promise<number> {
    const key = normalizeName(name).toLowerCase();
    const cached = level2ByName.get(key);
    if (cached) return cached;
    const slug = `${slugify(name)}-mkj`.slice(0, 180);
    if (DRY) {
      console.log(`  [DRY] INSERT L2 "${name}" (slug=${slug}, parent=${rootId})`);
      const fakeId = -Math.floor(Math.random() * 1000000);
      level2ByName.set(key, fakeId);
      return fakeId;
    }
    const inserted = await db
      .insert(categories)
      .values({ slug, name: normalizeName(name), parentId: rootId })
      .returning({ id: categories.id });
    const id = inserted[0]!.id;
    level2ByName.set(key, id);
    console.log(`  + L2 "${name}" #${id}`);
    return id;
  }

  async function ensureLevel3(parentId: number, name: string): Promise<number> {
    const key = `${parentId}::${normalizeName(name).toLowerCase()}`;
    const cached = level3ByParentAndName.get(key);
    if (cached) return cached;
    const slug = `${slugify(name)}-mkj-${parentId}`.slice(0, 180);
    if (DRY) {
      console.log(`    [DRY] INSERT L3 "${name}" (slug=${slug}, parent=${parentId})`);
      const fakeId = -Math.floor(Math.random() * 1000000);
      level3ByParentAndName.set(key, fakeId);
      return fakeId;
    }
    const inserted = await db
      .insert(categories)
      .values({ slug, name: normalizeName(name), parentId })
      .returning({ id: categories.id });
    const id = inserted[0]!.id;
    level3ByParentAndName.set(key, id);
    console.log(`    + L3 "${name}" #${id} (под #${parentId})`);
    return id;
  }

  // 3. Пройти все Billz-товары
  const PAGE = 100;
  let page = 1;
  let total = Infinity;
  let scanned = 0;
  let inMakiyazh = 0;
  const reassignPlan: { billzId: string; name: string; targetCategoryId: number; level: 2 | 3 }[] = [];

  while ((page - 1) * PAGE < total) {
    const resp = await fetchProductsPage(page, PAGE);
    total = resp.count;
    for (const p of resp.products as BillzProduct[]) {
      scanned++;
      const top = p.categories?.[0]?.name;
      if (!top || normalizeName(top).toLowerCase() !== ROOT_NAME.toLowerCase()) continue;
      inMakiyazh++;

      const l2Raw = getCustomField(p, "ПОДКАТЕГОРИЯ");
      const l3Raw = getCustomField(p, "ПОД_ПОДКАТЕГОРИЯ");
      const l2Name = l2Raw ? canonicalize(l2Raw) : null;
      const l3Name = l3Raw ? canonicalize(l3Raw) : null;

      if (!l2Name) continue;
      const l2Id = await ensureLevel2(l2Name);
      let target = l2Id;
      let level: 2 | 3 = 2;
      if (l3Name) {
        target = await ensureLevel3(l2Id, l3Name);
        level = 3;
      }
      reassignPlan.push({ billzId: p.id, name: p.name, targetCategoryId: target, level });
    }
    if (resp.products.length < PAGE) break;
    page++;
  }
  console.log(`Просмотрено: ${scanned}, из них Макияж: ${inMakiyazh}, план переназначений: ${reassignPlan.length}`);

  // 4. Обновить products.category_id
  let updated = 0;
  for (const step of reassignPlan) {
    if (DRY) continue;
    // не трогаем soft-deleted; для скрытых обновляем всё равно
    const res = await db
      .update(products)
      .set({ categoryId: step.targetCategoryId, updatedAt: new Date() })
      .where(eq(products.billzId, step.billzId))
      .returning({ id: products.id });
    if (res[0]) updated++;
  }

  console.log(`\nИтого:`);
  console.log(`  L2 сейчас: ${level2ByName.size}`);
  console.log(`  L3 сейчас: ${level3ByParentAndName.size}`);
  console.log(`  Обновлено товаров: ${updated}${DRY ? " (DRY)" : ""}`);

  await pg.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
