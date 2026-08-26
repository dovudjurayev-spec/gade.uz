/**
 * READ-ONLY аудит дерева категорий. Ничего не меняет.
 *
 * Собирает:
 *  1. Полное дерево categories (id, parent_id, level, slug, name, sort_order, is_visible, счётчики товаров).
 *  2. Дубли по нормализованному имени — глобально и в пределах одного родителя.
 *  3. Узлы глубже 3 уровней и потенциальные циклы.
 *  4. Товары без категории; товары на нелистовых узлах; категории без товаров.
 *  5. Сырое поле categories из Billz для 20 товаров — чтобы понять,
 *     это упорядоченный путь или параллельные теги.
 *
 * Записывает отчёт в docs/category-audit.md.
 * Запуск: npx tsx scripts/audit-category-tree.ts
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull, sql as dsql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { categories, products } from "../src/db/schema";
import { fetchProductsPage } from "../src/lib/billz/client";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL is not set");
const pg = postgres(dbUrl, { max: 1, ssl: "require" });
const db = drizzle(pg, { schema });

type Row = {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  sortOrder: number;
  isVisible: boolean;
  total: number;
  visible: number;
};

function normalizeName(input: string): string {
  return input
    .replace(/\u00A0/g, " ")
    .replace(/ё/gi, (m) => (m === "Ё" ? "Е" : "е"))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function detectCycle(all: Map<number, Row>, id: number, seen = new Set<number>()): boolean {
  if (seen.has(id)) return true;
  seen.add(id);
  const r = all.get(id);
  if (!r || r.parentId == null) return false;
  return detectCycle(all, r.parentId, seen);
}

function computeLevel(all: Map<number, Row>, id: number): number {
  let level = 1;
  let cur = all.get(id);
  const guard = new Set<number>();
  while (cur && cur.parentId != null) {
    if (guard.has(cur.id)) return -1; // cycle
    guard.add(cur.id);
    cur = all.get(cur.parentId) ?? undefined;
    level++;
    if (level > 20) return -1;
  }
  return level;
}

async function main() {
  const catRows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      slug: categories.slug,
      name: categories.name,
      sortOrder: categories.sortOrder,
      isVisible: categories.isVisible,
      total: dsql<number>`count(${products.id})::int`,
      visible: dsql<number>`count(*) FILTER (WHERE ${products.isVisible} = true AND ${products.deletedAt} IS NULL)::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(dsql`coalesce(${categories.parentId}, 0), ${categories.sortOrder}, ${categories.name}`);

  const byId = new Map<number, Row>();
  for (const r of catRows) byId.set(r.id, r as Row);
  const children = new Map<number | null, Row[]>();
  for (const r of catRows) {
    const key = r.parentId ?? null;
    const arr = children.get(key) ?? [];
    arr.push(r as Row);
    children.set(key, arr);
  }

  const levels = new Map<number, number>();
  const cycles: number[] = [];
  const deep: Row[] = [];
  for (const r of catRows) {
    if (detectCycle(byId, r.id)) {
      cycles.push(r.id);
      levels.set(r.id, -1);
      continue;
    }
    const lvl = computeLevel(byId, r.id);
    levels.set(r.id, lvl);
    if (lvl > 3) deep.push(r as Row);
  }

  const nonLeaf = new Set<number>();
  for (const r of catRows) if (r.parentId != null) nonLeaf.add(r.parentId);

  // Дубли: глобально по нормализованному имени
  const globalGroups = new Map<string, Row[]>();
  const localGroups = new Map<string, Row[]>();
  for (const r of catRows) {
    const norm = normalizeName(r.name);
    (globalGroups.get(norm) ?? globalGroups.set(norm, []).get(norm)!).push(r as Row);
    const key = `${r.parentId ?? 0}::${norm}`;
    (localGroups.get(key) ?? localGroups.set(key, []).get(key)!).push(r as Row);
  }
  const globalDups = [...globalGroups.values()].filter((g) => g.length > 1);
  const localDups = [...localGroups.values()].filter((g) => g.length > 1);

  // Товары
  const noCatRow = await db
    .select({
      noCategory: dsql<number>`count(*) FILTER (WHERE ${products.categoryId} IS NULL)::int`,
    })
    .from(products)
    .where(and(eq(products.isVisible, true), isNull(products.deletedAt)));
  const noCategory = noCatRow[0]?.noCategory ?? 0;

  const productsOnNonLeaf: { id: number; name: string; categoryId: number }[] = [];
  const allVisible = await db
    .select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(and(eq(products.isVisible, true), isNull(products.deletedAt)));
  for (const p of allVisible) {
    if (p.categoryId != null && nonLeaf.has(p.categoryId)) {
      productsOnNonLeaf.push({ id: p.id, name: p.name, categoryId: p.categoryId });
    }
  }

  const emptyCategories = catRows.filter((r) => r.total === 0);

  // Билз-семплы
  let billzSample: { name: string; categories: unknown }[] = [];
  let billzError: string | null = null;
  try {
    const resp = await fetchProductsPage(1, 20);
    billzSample = resp.products.map((p) => ({ name: p.name, categories: p.categories }));
  } catch (e) {
    billzError = e instanceof Error ? e.message : String(e);
  }

  // Формируем markdown
  const lines: string[] = [];
  lines.push("# Category tree audit");
  lines.push("");
  lines.push(`_Сгенерировано: ${new Date().toISOString()}_`);
  lines.push("");
  lines.push("## Сводка");
  lines.push(`- Всего категорий: **${catRows.length}**`);
  lines.push(`- Корневых (parent_id IS NULL): **${(children.get(null) ?? []).length}**`);
  lines.push(`- Циклов обнаружено: **${cycles.length}**`);
  lines.push(`- Узлов глубже 3 уровней: **${deep.length}**`);
  lines.push(`- Групп дубликатов имён (глобально): **${globalDups.length}**`);
  lines.push(`- Групп дубликатов имён у одного родителя: **${localDups.length}**`);
  lines.push(`- Категорий без товаров: **${emptyCategories.length}**`);
  lines.push(`- Видимых товаров без категории: **${noCategory}**`);
  lines.push(`- Видимых товаров, привязанных к нелистовому узлу: **${productsOnNonLeaf.length}**`);
  lines.push("");

  lines.push("## Дерево категорий");
  lines.push("");
  lines.push("```");
  const printTree = (parent: number | null, indent: string) => {
    const kids = children.get(parent) ?? [];
    for (const k of kids) {
      const lvl = levels.get(k.id);
      const hidden = k.isVisible ? "" : " [HIDDEN]";
      const lvlBad = lvl && lvl > 3 ? " ⚠ level>3" : "";
      lines.push(
        `${indent}#${k.id} [L${lvl ?? "?"}] ${k.name} — slug=${k.slug} sort=${k.sortOrder} products=${k.visible}/${k.total}${hidden}${lvlBad}`,
      );
      printTree(k.id, indent + "  ");
    }
  };
  printTree(null, "");
  lines.push("```");
  lines.push("");

  if (cycles.length > 0) {
    lines.push("## ⚠ Циклы");
    lines.push("");
    for (const id of cycles) {
      const r = byId.get(id);
      lines.push(`- #${id} ${r?.name ?? ""} (parent=${r?.parentId ?? "?"})`);
    }
    lines.push("");
  }

  if (deep.length > 0) {
    lines.push("## ⚠ Узлы глубже 3 уровней");
    lines.push("");
    for (const r of deep) {
      lines.push(`- #${r.id} ${r.name} — level=${levels.get(r.id)}, parent=${r.parentId}`);
    }
    lines.push("");
  }

  if (globalDups.length > 0) {
    lines.push("## Дубли по нормализованному имени (глобально)");
    lines.push("");
    lines.push("| Нормализованное имя | Кол-во | ID узлов |");
    lines.push("| --- | ---: | --- |");
    for (const g of globalDups.slice(0, 100)) {
      const ids = g.map((r) => `#${r.id}(parent=${r.parentId ?? "root"}, prod=${r.visible})`).join(", ");
      lines.push(`| ${normalizeName(g[0]!.name)} | ${g.length} | ${ids} |`);
    }
    if (globalDups.length > 100) lines.push(`| _…ещё ${globalDups.length - 100}_ | | |`);
    lines.push("");
  }

  if (localDups.length > 0) {
    lines.push("## Дубли у одного родителя");
    lines.push("");
    lines.push("| Родитель | Имя | Кол-во | ID узлов |");
    lines.push("| --- | --- | ---: | --- |");
    for (const g of localDups) {
      const parent = g[0]!.parentId == null ? "root" : `#${g[0]!.parentId} ${byId.get(g[0]!.parentId)?.name ?? ""}`;
      lines.push(
        `| ${parent} | ${g[0]!.name} | ${g.length} | ${g.map((r) => `#${r.id}(prod=${r.visible})`).join(", ")} |`,
      );
    }
    lines.push("");
  }

  if (productsOnNonLeaf.length > 0) {
    lines.push("## Товары, привязанные к нелистовому узлу");
    lines.push("");
    lines.push("| product_id | product | category |");
    lines.push("| ---: | --- | --- |");
    for (const p of productsOnNonLeaf.slice(0, 200)) {
      const c = byId.get(p.categoryId);
      lines.push(`| ${p.id} | ${p.name} | #${p.categoryId} ${c?.name ?? "?"} |`);
    }
    if (productsOnNonLeaf.length > 200) {
      lines.push(`\n_...ещё ${productsOnNonLeaf.length - 200}_`);
    }
    lines.push("");
  }

  if (emptyCategories.length > 0) {
    lines.push("## Категории без товаров");
    lines.push("");
    for (const r of emptyCategories) {
      lines.push(`- #${r.id} ${r.name} (slug=${r.slug}, parent=${r.parentId ?? "root"}, visible=${r.isVisible})`);
    }
    lines.push("");
  }

  lines.push("## Billz sample — сырое поле `categories` (20 товаров)");
  lines.push("");
  if (billzError) {
    lines.push(`_Ошибка запроса к Billz: ${billzError}_`);
  } else {
    lines.push("```json");
    lines.push(JSON.stringify(billzSample, null, 2));
    lines.push("```");
    // Быстрый вывод: сколько товаров имеет >1 категории (значит теги, а не путь)
    const multi = billzSample.filter((x) => Array.isArray(x.categories) && (x.categories as unknown[]).length > 1);
    lines.push("");
    lines.push(`- Товаров с более чем 1 категорией: **${multi.length} из ${billzSample.length}**`);
    lines.push(
      `- Скорее всего это ${multi.length > billzSample.length / 3 ? "**теги (не путь)**" : "**упорядоченный путь**"} — проверить руками.`,
    );
  }
  lines.push("");

  const outPath = resolve(process.cwd(), "docs/category-audit.md");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Отчёт: ${outPath}`);
  console.log(`Категорий: ${catRows.length} | дублей глобально: ${globalDups.length} | у родителя: ${localDups.length} | глубже 3: ${deep.length} | нелистовые товары: ${productsOnNonLeaf.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pg.end({ timeout: 5 }));
