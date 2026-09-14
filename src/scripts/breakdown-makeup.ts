import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

const buckets: [string, RegExp][] = [
  ["Помада", /помад/i],
  ["Блеск для губ", /блеск/i],
  ["Бальзам для губ", /бальзам/i],
  ["Карандаш губ", /^каран[ад]?аш\s+(?:для\s+)?губ/i],
  ["Карандаш глаз", /^каран[ад]?аш\s+(?:для\s+)?глаз/i],
  ["Карандаш бровей", /^каран[ад]?аш\s+(?:для\s+)?бров/i],
  ["Карандаш (др.)", /^каран[ад]?аш/i],
  ["Тушь", /тушь/i],
  ["Подводка", /подводк/i],
  ["Тени", /тен[еий]/i],
  ["Палетка", /палет/i],
  ["Гель для бровей", /гель.*бров/i],
  ["Тональный крем", /тональн/i],
  ["Пудра", /пудр/i],
  ["Консилер/Корректор", /(консилер|корректор)/i],
  ["Праймер", /праймер/i],
  ["База под макияж", /база/i],
  ["Фиксатор", /фиксатор/i],
  ["Хайлайтер", /хайлайтер/i],
  ["Румяна", /румян/i],
  ["Контуринг/Бронзер", /(контуринг|бронзер)/i],
  ["Косметичка", /косметичк/i],
  ["Подарочный набор", /(подарочн|набор)/i],
];

async function main() {
  const cat = await db.query.categories.findFirst({ where: eq(categories.slug, "makiyazh") });
  if (!cat) return;
  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.categoryId, cat.id), eq(products.isVisible, true), isNull(products.deletedAt)));
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
  console.log(`Total in-stock (makiyazh): ${rows.length}\n`);
  for (const [label, _re] of buckets) {
    const n = counts.get(label);
    if (n) console.log(`${String(n).padStart(4)}  ${label}`);
  }
  console.log(`${String(other.length).padStart(4)}  Прочее`);
  console.log("\nПрочее (первые 40):");
  for (const n of other.slice(0, 40)) console.log("  ·", n);
}
main().then(() => process.exit(0));
