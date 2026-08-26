/**
 * READ-ONLY: проходит ВСЕ страницы Billz и считает покрытие категориями.
 * Ничего не пишет в БД, только читает и добавляет секцию в docs/category-audit.md.
 *
 * Собирает:
 *  1. Сколько товаров с непустым categories vs пустым.
 *  2. Уникальные name из categories, частота, parent_id (если проставлен).
 *  3. Кросс-проверка: сколько наших товаров имеют category_id,
 *     но в свежем Billz у них categories пустое (кандидаты в "keep manual").
 *  4. Сколько наших товаров без category_id, а Billz прислал непустое categories.
 *
 * Запуск: npx tsx scripts/audit-billz-categories.ts
 */
import "dotenv/config";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { isNotNull } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { products } from "../src/db/schema";
import { fetchProductsPage, type BillzProduct } from "../src/lib/billz/client";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const pg = postgres(dbUrl, { max: 1, ssl: "require" });
const db = drizzle(pg, { schema });

const PAGE_SIZE = 100;

type BillzRow = {
  id: string;
  name: string;
  categories: { id: string; name: string; parent_id?: string }[] | null;
};

function normalizeName(input: string): string {
  return input
    .replace(/\u00A0/g, " ")
    .replace(/ё/gi, (m) => (m === "Ё" ? "Е" : "е"))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function main() {
  console.log("Скачиваю все страницы Billz...");
  const all: BillzRow[] = [];
  let page = 1;
  let total = Infinity;
  while ((page - 1) * PAGE_SIZE < total) {
    const resp = await fetchProductsPage(page, PAGE_SIZE);
    total = resp.count;
    for (const p of resp.products as (BillzProduct & { categories: BillzRow["categories"] })[]) {
      all.push({ id: p.id, name: p.name, categories: p.categories ?? null });
    }
    console.log(`  page ${page}: ${resp.products.length} товаров, всего ${all.length}/${total}`);
    page++;
  }

  const withCats = all.filter((p) => Array.isArray(p.categories) && p.categories!.length > 0);
  const withoutCats = all.length - withCats.length;

  // Частота уникальных имён категорий
  const nameFreq = new Map<string, { name: string; count: number; parents: Set<string> }>();
  const multiCatSample: BillzRow[] = [];
  for (const p of withCats) {
    if ((p.categories?.length ?? 0) > 1) multiCatSample.push(p);
    for (const c of p.categories ?? []) {
      const key = normalizeName(c.name);
      const entry = nameFreq.get(key) ?? { name: c.name, count: 0, parents: new Set<string>() };
      entry.count += 1;
      if (c.parent_id) entry.parents.add(c.parent_id);
      nameFreq.set(key, entry);
    }
  }

  // Кросс с БД
  const dbRows = await db
    .select({ id: products.id, billzId: products.billzId, categoryId: products.categoryId, name: products.name })
    .from(products)
    .where(isNotNull(products.billzId));

  const billzById = new Map(all.map((p) => [p.id, p] as const));

  let keepManual = 0; // у нас есть категория, у Billz — пусто
  let readyToAssign = 0; // у нас нет категории, у Billz — есть
  const keepManualSample: { id: number; name: string; billzId: string | null }[] = [];
  const readyToAssignSample: { id: number; name: string; billzCat: string }[] = [];
  for (const r of dbRows) {
    const bp = r.billzId ? billzById.get(r.billzId) : null;
    if (!bp) continue;
    const billzHasCat = Array.isArray(bp.categories) && bp.categories.length > 0;
    if (r.categoryId != null && !billzHasCat) {
      keepManual++;
      if (keepManualSample.length < 20) keepManualSample.push({ id: r.id, name: r.name, billzId: r.billzId });
    }
    if (r.categoryId == null && billzHasCat) {
      readyToAssign++;
      if (readyToAssignSample.length < 20)
        readyToAssignSample.push({ id: r.id, name: r.name, billzCat: bp.categories![0]!.name });
    }
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Billz — полный проход по каталогу");
  lines.push("");
  lines.push(`_Сгенерировано: ${new Date().toISOString()}_`);
  lines.push("");
  lines.push(`- Всего товаров в Billz: **${all.length}**`);
  lines.push(`- С непустым \`categories\`: **${withCats.length}** (${((withCats.length / all.length) * 100).toFixed(1)}%)`);
  lines.push(`- С пустым \`categories\`: **${withoutCats}** (${((withoutCats / all.length) * 100).toFixed(1)}%)`);
  lines.push(`- С двумя и более категориями: **${multiCatSample.length}**`);
  lines.push(`- Уникальных имён категорий: **${nameFreq.size}**`);
  lines.push("");
  lines.push("### Уникальные имена категорий из Billz");
  lines.push("");
  lines.push("| Имя | Товаров | parent_id проставлен? |");
  lines.push("| --- | ---: | --- |");
  const sorted = [...nameFreq.values()].sort((a, b) => b.count - a.count);
  for (const e of sorted) {
    const parents = [...e.parents].filter((x) => x && x !== "");
    lines.push(`| ${e.name} | ${e.count} | ${parents.length > 0 ? parents.join(", ") : "нет"} |`);
  }
  lines.push("");
  lines.push("### Кросс-проверка с нашей БД");
  lines.push("");
  lines.push(`- Наших товаров с \`category_id\`, у которых Billz прислал пустое \`categories\`: **${keepManual}**`);
  lines.push(`  _(это те, кого текущий синк обнуляет — после фикса А остаются как есть)_`);
  lines.push(`- Наших товаров без \`category_id\`, у которых Billz прислал непустое \`categories\`: **${readyToAssign}**`);
  lines.push(`  _(могут быть привязаны при следующем синке или разобраны вручную)_`);
  lines.push("");
  if (keepManualSample.length > 0) {
    lines.push("<details><summary>Примеры keep-manual (до 20)</summary>");
    lines.push("");
    for (const s of keepManualSample) lines.push(`- #${s.id} ${s.name} (billz=${s.billzId})`);
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
  if (readyToAssignSample.length > 0) {
    lines.push("<details><summary>Примеры ready-to-assign (до 20)</summary>");
    lines.push("");
    for (const s of readyToAssignSample) lines.push(`- #${s.id} ${s.name} → «${s.billzCat}»`);
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }
  lines.push("### Вывод");
  lines.push("");
  const flatRatio = withoutCats / all.length;
  if (flatRatio > 0.5) {
    lines.push("Billz отдаёт категорию **у меньшинства** товаров — сайт остаётся единственным источником истины.");
  } else if (flatRatio > 0.1) {
    lines.push("Billz покрывает большинство товаров, но заметная часть без категории — синк не может быть единственным источником.");
  } else {
    lines.push("Billz покрывает почти весь каталог — можно рассматривать его как основу с ручными правками поверх.");
  }
  const withParents = sorted.filter((e) => e.parents.size > 0 && ![...e.parents].every((x) => !x || x === "")).length;
  lines.push(`Категорий с непустым \`parent_id\` в Billz: **${withParents}** из ${nameFreq.size} — иерархии ${withParents > 0 ? "частично есть" : "нет"}.`);
  lines.push("");

  const outPath = resolve(process.cwd(), "docs/category-audit.md");
  if (!existsSync(outPath)) {
    writeFileSync(outPath, "# Category tree audit\n\n_(файл не был найден, создан новый)_\n", "utf8");
  }
  appendFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Отчёт дополнен: ${outPath}`);
  console.log(
    `Итого: ${all.length} товаров | с категориями ${withCats.length} | keep-manual ${keepManual} | ready-to-assign ${readyToAssign}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pg.end({ timeout: 5 }));
