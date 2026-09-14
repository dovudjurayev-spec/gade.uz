import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

// Пере-раскладка товаров, привязанных напрямую к корню "Макияж" (id=6),
// в соответствующие L3-подкатегории по имени.
//
// L2/L3 макияжа:
//   Брови   → Карандаш(karandash-mkj-15), Тени(teni-mkj-15), Гель(gel-dlya-brovei-mkj-15)
//   Глаза   → Тени(teni-mkj-16), Паллеты(pallety-tenei-mkj-16), Тушь(tush-mkj-16),
//             Карандаш(karandash-mkj-16), Подводка(podvodka-mkj-16), Праймер(praimer-mkj-16)
//   Губы    → Помада(pomada-mkj-17), Блеск(blesk-mkj-17), Карандаш(karandash-mkj-17), Бальзам(balzam-mkj-17)
//   Лицо    → Корректор/Консилер, Тональный крем, Румяна, База, Хайлайтер, Блеск,
//             Пудра, Контуринг, Фиксатор, Рассыпчатый блеск
//   Подарочный набор → podarochnyy-nabor-makiyazh

type Rule = { match: (n: string) => boolean; slug: string; note: string };
const has = (n: string, ...subs: string[]) => subs.some((s) => n.includes(s));
const hasBrow = (n: string) => has(n, "бров");

// Порядок правил критичен: первое совпавшее правило применяется.
// Всё в нижнем регистре — сравниваем на нормализованном имени.
const RULES: Rule[] = [
  // --- Брови (проверяем раньше «карандаш/тени», чтобы не улететь в глаза) ---
  { match: (n) => hasBrow(n) && n.includes("карандаш"), slug: "karandash-mkj-15", note: "Карандаш для бровей" },
  { match: (n) => hasBrow(n) && n.includes("тени"), slug: "teni-mkj-15", note: "Тени для бровей" },
  { match: (n) => hasBrow(n) && n.includes("гель"), slug: "gel-dlya-brovei-mkj-15", note: "Гель для бровей" },

  // --- Губы ---
  { match: (n) => n.includes("помад"), slug: "pomada-mkj-17", note: "Помада" },
  { match: (n) => n.includes("бальзам"), slug: "balzam-mkj-17", note: "Бальзам губ" },
  { match: (n) => n.includes("карандаш") && (n.includes("губ") || n.includes("everlasting для губ") || n.includes("idyllic губы")), slug: "karandash-mkj-17", note: "Карандаш для губ" },
  // Блеск: у нас все "Блеск Crystal Lights ..." и "Блеск для губ ..." — губы.
  { match: (n) => n.includes("блеск") && (n.includes("губ") || n.includes("crystal lights")), slug: "blesk-mkj-17", note: "Блеск для губ" },
  { match: (n) => n.includes("увлажняющее масло") && n.includes("gloss"), slug: "balzam-mkj-17", note: "Масло для губ" },

  // --- Глаза ---
  { match: (n) => n.includes("тушь"), slug: "tush-mkj-16", note: "Тушь" },
  { match: (n) => has(n, "подводка", "dipliner", "topliner", "фломастер", "фламастер"), slug: "podvodka-mkj-16", note: "Подводка" },
  { match: (n) => n.includes("карандаш") && has(n, "глаз", " slim ", "slim ", "selfie"), slug: "karandash-mkj-16", note: "Карандаш для глаз" },
  { match: (n) => n.includes("паллет"), slug: "pallety-tenei-mkj-16", note: "Паллеты теней" },
  { match: (n) => n.includes("тени"), slug: "teni-mkj-16", note: "Тени" },
  { match: (n) => n.includes("праймер") && (n.includes("век") || n.includes("глаз")), slug: "praimer-mkj-16", note: "Праймер глаз" },
  { match: (n) => n.includes("essentials праймер"), slug: "praimer-mkj-16", note: "Праймер для век" },

  // --- Лицо ---
  {
    match: (n) =>
      has(n, "тональн", "photo finish", "matte perfect", "matte velvet", "skin velvet", "second skin", "mirage mattifying", "revitality") ||
      /(longevity)\s*(24|502|550|second skin)/i.test(n),
    slug: "tonalnyi-krem-mkj-18",
    note: "Тональный крем",
  },
  { match: (n) => n.includes("рассыпчат"), slug: "pudra-mkj-18", note: "Рассыпчатая пудра" },
  { match: (n) => n.includes("пудра"), slug: "pudra-mkj-18", note: "Пудра" },
  { match: (n) => n.includes("румян"), slug: "rumyana-mkj-18", note: "Румяна" },
  { match: (n) => has(n, "хайлайтер", "glow fx", "glow-fx"), slug: "hailaiter-mkj-18", note: "Хайлайтер" },
  { match: (n) => has(n, "консилер", "корректор"), slug: "korrektor-konsiler-mkj-18", note: "Корректор/Консилер" },
  { match: (n) => n.includes("контуринг"), slug: "konturing-mkj-18", note: "Контуринг" },
  { match: (n) => n.includes("база"), slug: "baza-mkj-18", note: "База под макияж" },
  { match: (n) => n.includes("фиксатор"), slug: "fiksator-mkj-18", note: "Фиксатор" },

  // --- Подарочный набор ---
  { match: (n) => n.includes("набор теней"), slug: "pallety-tenei-mkj-16", note: "Паллеты (наборы теней)" },
  { match: (n) => n.startsWith("набор ") || n.includes("подарочн") || n.includes("gift"), slug: "podarochnyy-nabor-makiyazh", note: "Подарочный набор" },

  // --- Пропущенные брендовые серии ---
  { match: (n) => n.includes("brow builder"), slug: "karandash-mkj-15", note: "Карандаш для бровей" },
  { match: (n) => n.startsWith("metallic"), slug: "karandash-mkj-16", note: "Карандаш для глаз" },

  // --- Не макияж, но лежит на корне «Макияж»: косметички → Аксессуары/Косметичка ---
  { match: (n) => n.includes("косметичк"), slug: "kosmetichka", note: "Косметичка → Аксессуары" },
];

async function main() {
  const dryRun = process.argv.includes("--apply") ? false : true;
  const root = await db.query.categories.findFirst({ where: eq(categories.slug, "makiyazh") });
  if (!root) throw new Error("makiyazh not found");

  const allCats = await db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories);
  const catBySlug = new Map(allCats.map((c) => [c.slug, c] as const));

  const rows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(and(eq(products.categoryId, root.id), isNull(products.deletedAt), eq(products.isVisible, true)));

  console.log(`Products on root Макияж: ${rows.length}\n`);
  let matched = 0;
  const unmatched: { id: number; name: string }[] = [];
  const byCat = new Map<string, number>();

  for (const p of rows) {
    const norm = p.name.toLowerCase().replace(/\s+/g, " ").trim();
    const rule = RULES.find((r) => r.match(norm));
    if (!rule) { unmatched.push(p); continue; }
    const target = catBySlug.get(rule.slug);
    if (!target) { console.warn(`⚠ missing L3 slug: ${rule.slug}`); unmatched.push(p); continue; }
    matched++;
    byCat.set(rule.note, (byCat.get(rule.note) ?? 0) + 1);
    if (!dryRun) {
      await db.update(products).set({ categoryId: target.id, updatedAt: new Date() }).where(eq(products.id, p.id));
    }
    console.log(`${dryRun ? "·" : "✓"} #${p.id}  ${p.name}  →  ${rule.note}`);
  }

  console.log(`\n${dryRun ? "[DRY-RUN] Matched" : "Updated"}: ${matched}/${rows.length}`);
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, n] of sorted) console.log(`  ${String(n).padStart(4)}  ${k}`);
  if (unmatched.length) {
    console.log(`\nUnmatched (${unmatched.length}):`);
    for (const u of unmatched) console.log(`  · #${u.id}  ${u.name}`);
  }
  if (dryRun) console.log(`\nRun with --apply to persist changes.`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
