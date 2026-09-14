import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull, isNotNull } from "drizzle-orm";

const CATS = ["nogti", "uhod-za-litsom", "aksessuary", "parfyumeriya", "uhod-za-telom"];

const rules: Record<string, [string, RegExp][]> = {
  nogti: [
    ["Лак для ногтей", /лак/i],
    ["База/Топ", /(баз|топ)/i],
    ["Средство для ногтей (уход)", /(масло|уход|укрепит|восстанов)/i],
    ["Пилка/Инструмент", /(пилк|инструмент|ножниц|кусачк)/i],
  ],
  "uhod-za-litsom": [
    ["Крем для лица", /крем/i],
    ["Сыворотка", /сыворотк/i],
    ["Маска", /маск/i],
    ["Очищение (гель/пенка/молочко)", /(очищ|гель|пенк|молочк|мицелляр|тоник)/i],
    ["Масло", /масл/i],
    ["Патчи", /патч/i],
    ["Скраб/Пилинг", /(скраб|пилинг)/i],
  ],
  aksessuary: [
    ["Кисть", /кисть|кисти/i],
    ["Спонж", /спонж/i],
    ["Точилка", /точилк/i],
    ["Косметичка", /косметичк/i],
    ["Брелок", /брелок/i],
    ["Зеркало", /зеркал/i],
  ],
  parfyumeriya: [
    ["Женский парфюм", /(жен|women|femme|for her)/i],
    ["Мужской парфюм", /(муж|men|homme|for him)/i],
    ["Набор парфюма", /(набор|set)/i],
  ],
  "uhod-za-telom": [
    ["Крем/Лосьон для тела", /(крем|лосьон)/i],
    ["Масло для тела", /масл/i],
    ["Дезодорант", /дезодорант/i],
    ["Скраб/Соль", /(скраб|соль)/i],
    ["Гель для душа", /(гель|душ|мыл)/i],
    ["Спрей", /спрей/i],
  ],
};

async function main() {
  for (const slug of CATS) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (!cat) continue;
    const rows = await db
      .select({ name: products.name })
      .from(products)
      .where(and(eq(products.categoryId, cat.id), eq(products.isVisible, true), isNull(products.deletedAt)));
    const buckets = rules[slug];
    if (!buckets) continue;
    const counts = new Map<string, number>();
    const other: string[] = [];
    for (const r of rows) {
      let matched = false;
      for (const [label, re] of buckets) {
        if (re.test(r.name)) {
          counts.set(label, (counts.get(label) ?? 0) + 1);
          matched = true;
          break;
        }
      }
      if (!matched) other.push(r.name);
    }
    console.log(`\n=== ${cat.name} (${rows.length}) ===`);
    for (const [label] of buckets) {
      const n = counts.get(label);
      if (n) console.log(`${String(n).padStart(4)}  ${label}`);
    }
    console.log(`${String(other.length).padStart(4)}  Прочее`);
    if (other.length) {
      console.log("  примеры:", other.slice(0, 8).join(" | "));
    }
  }
}
main().then(() => process.exit(0));
