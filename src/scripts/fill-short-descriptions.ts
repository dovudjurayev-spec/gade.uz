import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull, or, sql, asc } from "drizzle-orm";

// Находит видимые товары без описания или с очень коротким описанием
// (короче MIN_LEN символов) и подставляет тексты по слагу категории.
// Флаг --apply — записать изменения, иначе dry-run.

const MIN_LEN = 40;

const CATEGORY_TEMPLATES: Record<string, (name: string) => string> = {
  "dnevnoi-l3-25": (n) =>
    `${n} — дневной крем GA-DE с лёгкой текстурой. Быстро впитывается, увлажняет и выравнивает тон кожи, готовит лицо к макияжу и защищает от внешних факторов в течение дня.`,
  "noch-l3-25": (n) =>
    `${n} — ночной крем GA-DE с восстанавливающими компонентами. Питает и разглаживает кожу во время сна, поддерживает упругость и утром возвращает свежий, отдохнувший вид.`,
  "glaza-l3-25": (n) =>
    `${n} — крем для кожи вокруг глаз GA-DE. Мягко ухаживает за деликатной зоной, увлажняет, уменьшает признаки усталости и разглаживает мелкие морщинки.`,
  "masla-i-syvorotki": (n) =>
    `${n} — концентрированный уход GA-DE. Насыщенная формула глубоко увлажняет, восстанавливает и возвращает коже сияние. Хорошо сочетается с любым кремом.`,
  "mini-obem-l3-25": (n) =>
    `${n} — компактный формат любимого крема GA-DE. Удобно брать с собой в поездку или пробовать новый продукт перед покупкой полноразмерного объёма.`,
  "sprey-dlya-tela": (n) =>
    `${n} — парфюмированный мист для тела GA-DE. Лёгкая формула освежает кожу, оставляет деликатный шлейф и подходит для повседневного использования.`,
  "losyon-dlya-tela": (n) =>
    `${n} — увлажняющий лосьон для тела GA-DE. Быстро впитывается, смягчает кожу и надолго сохраняет ощущение комфорта и ухоженности.`,
  "krem-dlya-ruk-uhod-za-telom": (n) =>
    `${n} — крем для рук GA-DE. Питает и смягчает кожу, защищает от сухости и восстанавливает её после воздействия воды и бытовых средств.`,
};

const FALLBACK = (n: string) =>
  `${n} — оригинальный продукт GA-DE. Качественная формула бренда, продуманный состав и стабильный результат при регулярном использовании.`;

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      catSlug: categories.slug,
      catName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.isVisible, true),
        isNull(products.deletedAt),
        or(
          isNull(products.description),
          sql`length(btrim(${products.description})) < ${MIN_LEN}`,
        ),
      ),
    )
    .orderBy(asc(categories.name), asc(products.name));

  // Тестовые/служебные позиции не трогаем.
  const filtered = rows.filter((r) => !/^тестов/i.test(r.name));
  console.log(`Found ${filtered.length} products with missing/short description (< ${MIN_LEN} chars).\n`);
  if (!filtered.length) return;

  for (const r of filtered) {
    const slug = r.catSlug ?? "";
    const gen = CATEGORY_TEMPLATES[slug] ?? FALLBACK;
    const text = gen(r.name);
    console.log(`#${r.id}  [${slug || "—"}]  ${r.name}`);
    console.log(`  old: ${r.description ?? "(null)"}`);
    console.log(`  new: ${text}\n`);
    if (apply) {
      await db
        .update(products)
        .set({ description: text, updatedAt: new Date() })
        .where(eq(products.id, r.id));
    }
  }

  console.log(apply ? `Updated ${filtered.length} products.` : `Dry-run. Re-run with --apply to persist.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
