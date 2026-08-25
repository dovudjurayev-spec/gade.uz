import "dotenv/config";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "../src/db/client";
import { brandLines, categories, products } from "../src/db/schema";

const MODEL = "gpt-4o-mini";
const CONCURRENCY = 5;

type Row = {
  id: number;
  name: string;
  volume: string | null;
  categoryName: string | null;
  brandLineName: string | null;
};

function buildPrompt(p: Row): string {
  return [
    `Ты копирайтер для e-commerce магазина косметики GA-DE в Узбекистане.`,
    `Напиши краткое описание товара на русском языке: 2–3 предложения, живой продающий стиль, без воды и без клише вроде "уникальный", "инновационный".`,
    `Фокус на том, что даёт продукт покупателю: эффект, ощущения, повод купить.`,
    `Не используй маркетинговые заглавные буквы, эмодзи, восклицательные знаки.`,
    `Не выдумывай состав, срок действия, конкретные цифры или клинические результаты.`,
    `Не начинай со слов "Этот товар" / "Данный продукт". Начни с сути.`,
    ``,
    `Название: ${p.name}`,
    p.brandLineName ? `Линейка: ${p.brandLineName}` : "",
    p.categoryName ? `Категория: ${p.categoryName}` : "",
    p.volume ? `Объём: ${p.volume}` : "",
    ``,
    `Выдай только сам текст описания, без заголовков, без кавычек, без префиксов.`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));

  const conditions = [eq(products.isVisible, true), isNull(products.deletedAt)];
  if (!force) {
    conditions.push(or(isNull(products.description), eq(products.description, ""))!);
  }
  if (onlyArg) {
    const ids = onlyArg.slice("--only=".length).split(",").map((s) => Number(s.trim())).filter(Number.isFinite);
    if (ids.length) conditions.push(inArray(products.id, ids));
  }

  const rows = (await db
    .select({
      id: products.id,
      name: products.name,
      volume: products.volume,
      categoryName: categories.name,
      brandLineName: brandLines.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brandLines, eq(products.brandLineId, brandLines.id))
    .where(and(...conditions))
    .orderBy(products.id)) as Row[];

  let queue = rows;
  if (limitArg) {
    const n = Number(limitArg.slice("--limit=".length));
    if (Number.isFinite(n) && n > 0) queue = queue.slice(0, n);
  }

  console.log(
    `Found ${rows.length} products needing descriptions${limitArg ? ` (processing first ${queue.length})` : ""}.`,
  );
  console.log(`Mode: ${apply ? "APPLY (writing to DB)" : "DRY-RUN (no writes, pass --apply)"}\n`);

  let done = 0;
  let failed = 0;
  const failures: string[] = [];

  let cursor = 0;
  async function worker(id: number) {
    while (true) {
      const i = cursor++;
      if (i >= queue.length) return;
      const p = queue[i]!;
      try {
        const res = await openai.chat.completions.create({
          model: MODEL,
          temperature: 0.7,
          max_tokens: 220,
          messages: [{ role: "user", content: buildPrompt(p) }],
        });
        const text = res.choices[0]?.message?.content?.trim();
        if (!text) throw new Error("empty response");
        const clean = text.replace(/^["'«»]+|["'«»]+$/g, "").trim();

        done++;
        console.log(`[w${id}] ${done}/${queue.length}  #${p.id}  ${p.name}`);
        console.log(`   → ${clean}\n`);

        if (apply) {
          await db
            .update(products)
            .set({ description: clean, updatedAt: new Date() })
            .where(eq(products.id, p.id));
        }
      } catch (e) {
        failed++;
        const msg = (e as Error).message;
        failures.push(`#${p.id} ${p.name}: ${msg}`);
        console.warn(`[w${id}]  ✗ #${p.id} ${p.name}: ${msg}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  console.log(`\nDone. Success: ${done}. Failed: ${failed}.`);
  if (failures.length) console.log("Failures:\n" + failures.join("\n"));
  if (!apply) console.log("\nDry-run only. Re-run with --apply to write to DB.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
