import { db } from "@/db/client";
import { products } from "@/db/schema";
import { inArray, isNull } from "drizzle-orm";

// Аудит: для товаров, которым ИКПУ был проставлен fallback'ом по slug'у категории,
// переклассифицируем по ключевым словам в НАЗВАНИИ. ИКПУ и порядок правил
// подобраны так, чтобы более специфичное правило шло раньше общего.
// Все ИКПУ верифицированы через tasnif.soliq.uz.
//
// ВАЖНО: не используем \b в кириллических паттернах — JS \b не учитывает
// не-ASCII буквы как word chars, из-за чего \bпомад ни разу не сматчит.

type Rule = { re: RegExp; ikpu: string; label: string };

const RULES: Rule[] = [
  // --- Аксессуары идут ПЕРВЫМИ: «Кисть для консилера» — это кисть, а не консилер ---
  { re: /кист(ь|и|ей|ями)/i,     ikpu: "09616002003000000", label: "кисть" },
  { re: /спонж/i,                ikpu: "09616002003000000", label: "спонж" },
  { re: /косметичк/i,            ikpu: "09616002003000000", label: "косметичка" },
  { re: /точилк/i,               ikpu: "09616002003000000", label: "точилка" },
  { re: /брелок/i,               ikpu: "09616002003000000", label: "брелок" },
  { re: /пакет|коробк/i,         ikpu: "09616002003000000", label: "упаковка" },

  // --- Гель для бровей — раньше «fix/флюид», иначе «Super Fix» поймает не то ---
  { re: /гель.*бров/i,           ikpu: "03304006001000000", label: "гель для бровей" },

  // --- Тональные / крем-пудра — раньше «помада»/«пудра»/«крем» ---
  { re: /крем[-\s]?пудра/i,      ikpu: "03304011020000000", label: "крем-пудра" },
  { re: /тональн/i,              ikpu: "03304011020000000", label: "тональный" },

  // --- Глаза ---
  { re: /туш[ьы]/i,              ikpu: "03304016002000000", label: "тушь" },
  { re: /подводк/i,              ikpu: "03304012004000000", label: "подводка" },

  // --- Хайлайтер / контуринг / румяна раньше «палетка», «тени», «набор» ---
  // Пример: «Everglow Палетка хайлайтер» → хайлайтер, а не тени.
  { re: /хайлайт/i,              ikpu: "03304999011000000", label: "хайлайтер" },
  { re: /контуринг|контор\b/i,   ikpu: "03304999011000000", label: "контуринг" },
  { re: /румян/i,                ikpu: "03304999010000000", label: "румяна" },

  // --- Тени / палетка теней ---
  { re: /тени|теней/i,           ikpu: "03307001018000000", label: "тени" },
  { re: /палет(т)?(а|ка|тка)/i,  ikpu: "03307001018000000", label: "палетка теней" },

  // --- Губы ---
  { re: /помад/i,                ikpu: "03304999006000000", label: "помада" },
  { re: /блеск/i,                ikpu: "03304005006000000", label: "блеск для губ" },
  { re: /бал?ьзам/i,             ikpu: "03304001001000000", label: "бальзам для губ" },
  { re: /масло\s+для\s+губ/i,    ikpu: "03304001001000000", label: "масло для губ" },

  // --- Карандаши по контексту (учитываем опечатки «каранадаш», «каранаш») ---
  { re: /каран[аоеи]?д?аш.*(бров|brow)/i, ikpu: "03304010004000000", label: "карандаш для бровей" },
  { re: /каран[аоеи]?д?аш.*(губ|lip)/i,   ikpu: "03304010001000000", label: "карандаш для губ" },
  { re: /каран[аоеи]?д?аш/i,               ikpu: "03304010003000000", label: "карандаш для глаз" },

  // --- Лицо ---
  { re: /пудра/i,                ikpu: "03304999009000000", label: "пудра" },
  { re: /консилер|корректор/i,   ikpu: "03304999012000000", label: "консилер/корректор" },
  { re: /праймер|прайм/i,        ikpu: "03304016004000000", label: "праймер" },
  { re: /фиксатор|фиксирующ/i,   ikpu: "03304999008000000", label: "фиксатор" },
  { re: /база\s+/i,              ikpu: "03304999008000000", label: "база под макияж" },

  // --- Уход за лицом ---
  { re: /сыворотк|сывротк|серум|serum|бустер|масло\s+для\s+лица|масло\s+pomegranate|увлажняющее\s+масло/i,
    ikpu: "03304999087000000", label: "сыворотка/серум/масло" },
  { re: /маска|маски|маску/i,    ikpu: "03304014001000000", label: "маска" },
  { re: /скраб|пиллинг|пилинг|молочко|умывани|гель.*(угр|очищ|умыв|жирн|сух|комбинир|нормаль|кож)|смывка|тоник|мицелляр|салфетк/i,
    ikpu: "03304999050000000", label: "очищение" },
  { re: /крем.*глаз|крем.*век|eye\s*cream|hydra\s+sublim.*eye/i, ikpu: "03304011008000000", label: "крем для глаз" },
  { re: /hydra\s+sublim/i,       ikpu: "03304011003000000", label: "крем для лица (Hydra Sublim)" },
  { re: /флюид|fluid|fix/i,      ikpu: "03304999008000000", label: "флюид/фиксатор" },
  { re: /тестер/i,               ikpu: "03304999084000000", label: "тестер (набор)" },

  // --- Тело / уход ---
  { re: /дезодорант|део(\s|$)/i, ikpu: "03307002002000000", label: "дезодорант" },
  { re: /боди\s*мист|body\s*mist|мист(\s|$)|спрей/i, ikpu: "03307001035000000", label: "мист/спрей для тела" },
  { re: /лосьон|lotion/i,        ikpu: "03304013001000000", label: "лосьон для тела" },
  { re: /крем\s*для\s*рук|hand\s*cream/i, ikpu: "03304999073000000", label: "крем для рук" },
  { re: /антисептик/i,           ikpu: "03304013001000000", label: "антисептик" },
  { re: /пена\s+для\s+ванны/i,   ikpu: "03304013001000000", label: "пена для ванны" },

  // --- Ногти ---
  { re: /лак/i,                  ikpu: "03304007001000000", label: "лак для ногтей" },

  // --- Наборы / подарочные — идут после «тени» намеренно: «Набор теней» = тени ---
  { re: /набор|подарочн/i,       ikpu: "03304999084000000", label: "подарочный набор" },

  // --- Крем (общий, для лица) — идёт после «крем для рук/глаз/пудра» ---
  { re: /крем/i,                 ikpu: "03304011003000000", label: "крем для лица" },

  // --- Парфюм ---
  { re: /парфюм|духи|eau\s*de/i, ikpu: "03303001001000000", label: "парфюм" },
];

const FALLBACK_IKPU = new Set([
  "03304999008000000",
  "03304011003000000",
  "03304011006000000",
  "09616002003000000",
  "03303001001000000",
  "03304007001000000",
]);

function classify(name: string): { ikpu: string; label: string } | null {
  for (const r of RULES) if (r.re.test(name)) return { ikpu: r.ikpu, label: r.label };
  return null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await db
    .select({ id: products.id, name: products.name, ikpu: products.ikpu })
    .from(products)
    .where(isNull(products.deletedAt));

  const changes = new Map<string, { ids: number[]; label: string }>();
  const unclassified: { id: number; name: string; oldIkpu: string }[] = [];
  const untouched: { id: number; name: string }[] = [];

  for (const p of rows) {
    const hit = classify(p.name);
    if (!hit) {
      unclassified.push({ id: p.id, name: p.name, oldIkpu: p.ikpu });
      continue;
    }
    if (p.ikpu && hit.ikpu === p.ikpu) {
      untouched.push({ id: p.id, name: p.name });
      continue;
    }
    const key = `${hit.ikpu}||${hit.label}`;
    if (!changes.has(key)) changes.set(key, { ids: [], label: hit.label });
    changes.get(key)!.ids.push(p.id);
  }

  const total = rows.filter((r) => r.ikpu && FALLBACK_IKPU.has(r.ikpu)).length;
  const planned = [...changes.values()].reduce((a, c) => a + c.ids.length, 0);
  console.log(`Всего товаров на fallback: ${total}`);
  console.log(`Переклассифицировать: ${planned}`);
  console.log(`Совпало с текущим ИКПУ (оставляем): ${untouched.length}`);
  console.log(`Не удалось классифицировать: ${unclassified.length}\n`);

  const sorted = [...changes.entries()].sort((a, b) => b[1].ids.length - a[1].ids.length);
  for (const [key, { ids, label }] of sorted) {
    const ikpu = key.split("||")[0]!;
    console.log(`  ${ikpu}  «${label}»  × ${ids.length}`);
  }

  if (unclassified.length > 0) {
    console.log(`\nНе классифицированы (${unclassified.length}):`);
    for (const u of unclassified.slice(0, 50)) console.log(`  #${u.id}  ${u.name}`);
    if (unclassified.length > 50) console.log(`  ... и ещё ${unclassified.length - 50}`);
  }

  if (dryRun) {
    console.log("\n[dry-run] изменения не применены. Убери --dry-run чтобы записать.");
    return;
  }

  let updated = 0;
  for (const [key, { ids }] of changes) {
    const ikpu = key.split("||")[0]!;
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await db
        .update(products)
        .set({ ikpu, packageCode: null, updatedAt: new Date() })
        .where(inArray(products.id, chunk));
      updated += chunk.length;
    }
  }
  console.log(`\nОбновлено: ${updated}`);
  console.log("Теперь запусти: npx tsx --env-file=.env src/scripts/assign-package-code.ts");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
