import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { eq, inArray, isNull } from "drizzle-orm";

// Категория (slug L2/L3) → ИКПУ (МХИК, 17-значный базовый код tasnif.soliq.uz)
// Все коды перепроверены прямым запросом к tasnif.soliq.uz.
const SLUG_TO_IKPU: Record<string, string> = {
  // --- Макияж: брови (L3 в mkj-15) ---
  "karandash-mkj-15": "03304010004000000",
  "teni-mkj-15": "03304018001000000",
  "gel-dlya-brovei-mkj-15": "03304006001000000",

  // --- Макияж: губы (mkj-17) ---
  "pomada-mkj-17": "03304999006000000",
  "balzam-mkj-17": "03304001001000000",
  "karandash-mkj-17": "03304010001000000",
  "blesk-mkj-17": "03304005006000000",

  // --- Макияж: глаза (mkj-16) ---
  "tush-mkj-16": "03304016002000000",
  "podvodka-mkj-16": "03304012004000000",
  "karandash-mkj-16": "03304010003000000",
  "pallety-tenei-mkj-16": "03307001018000000",
  "teni-mkj-16": "03307001018000000",
  "praimer-mkj-16": "03304016004000000",

  // --- Макияж: лицо (mkj-18) ---
  "tonalnyi-krem-mkj-18": "03304011020000000",
  "pudra-mkj-18": "03304999009000000",
  "rumyana-mkj-18": "03304999010000000",
  "hailaiter-mkj-18": "03304999011000000",
  "korrektor-konsiler-mkj-18": "03304999012000000",
  "konturing-mkj-18": "03304999011000000",
  "baza-mkj-18": "03304999008000000",
  "fiksator-mkj-18": "03304999008000000",
  "podarochnyy-nabor-makiyazh": "03304999084000000",

  // --- Уход за лицом ---
  "maska": "03304014001000000",
  "masla-i-syvorotki": "03304999087000000",
  "ochischenie": "03304999050000000",
  "glaza-l3-25": "03304011008000000",
  "noch-l3-25": "03304011003000000",
  "dnevnoi-l3-25": "03304011003000000",
  "mini-obem-l3-25": "03304011003000000",
  "krem": "03304011003000000",

  // --- Уход за телом ---
  "sprey-dlya-tela": "03307001035000000",
  "losyon-dlya-tela": "03304013001000000",
  "dezodorant": "03307002002000000",
  "krem-dlya-ruk-uhod-za-telom": "03304999073000000",

  // --- Ногти ---
  "uhod-za-nogtyami": "03304999024000000",
  "lak": "03304007001000000",

  // --- Парфюмерия ---
  "podarochnye-nabory-parfyum": "03303001001000000",
  "parfyum-zhenskiy": "03303001001000000",

  // --- Аксессуары ---
  "kosmetichka": "09616002003000000",
  "kisti": "09616002003000000",
  "sponzhi": "09616002003000000",
  "tochilka": "09616002003000000",
  "brelok-aksessuary": "09616002003000000",

  // --- Fallback по L1-корневым категориям (когда товар не разложен по L2/L3) ---
  "makiyazh": "03304999008000000",       // Основа и фиксатор для макияжа (общий)
  "uhod-za-litsom": "03304011003000000", // Крем для лица
  "uhod-za-telom": "03304011006000000",  // Крем для тела
  "nogti": "03304007001000000",          // Лак для ногтей
  "parfyumeriya": "03303001001000000",   // Парфюм / туалетная вода
  "aksessuary": "09616002003000000",     // Спонжи/аппликаторы
  "yarkie-l3-20": "03304011020000000",   // Тональный крем (тон)
};

async function main() {
  const cats = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const slugById = new Map(cats.map((c) => [c.id, c.slug]));

  const rows = await db
    .select({ id: products.id, name: products.name, categoryId: products.categoryId, ikpu: products.ikpu })
    .from(products)
    .where(isNull(products.deletedAt));

  // Группируем id продуктов по целевому ИКПУ и делаем один UPDATE на группу.
  const byIkpu = new Map<string, number[]>();
  let miss = 0;
  const missingSlugs = new Map<string, number>();

  for (const p of rows) {
    if (p.categoryId == null) continue;
    const slug = slugById.get(p.categoryId);
    if (!slug) continue;
    const ikpu = SLUG_TO_IKPU[slug];
    if (!ikpu) {
      miss++;
      missingSlugs.set(slug, (missingSlugs.get(slug) ?? 0) + 1);
      continue;
    }
    if (p.ikpu === ikpu) continue;
    if (!byIkpu.has(ikpu)) byIkpu.set(ikpu, []);
    byIkpu.get(ikpu)!.push(p.id);
  }

  let set = 0;
  for (const [ikpu, ids] of byIkpu) {
    // Neon HTTP не любит очень длинные IN — режем на батчи по 500.
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await db
        .update(products)
        .set({ ikpu, updatedAt: new Date() })
        .where(inArray(products.id, chunk));
      set += chunk.length;
    }
    console.log(`  ${ikpu} → ${ids.length}`);
  }

  console.log(`ИКПУ проставлен: ${set}`);
  console.log(`Без сопоставления: ${miss}`);
  if (missingSlugs.size > 0) {
    console.log("Slug'и без маппинга:");
    for (const [s, c] of missingSlugs) console.log(`  ${s}  ×${c}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
