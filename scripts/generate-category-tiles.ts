/**
 * Генерирует квадратные фоновые изображения для плиток категорий
 * на главной странице через OpenAI gpt-image-1.
 *
 * Сохраняет в /public/categories/{slug}.jpg.
 *
 * Запуск:
 *  npx tsx scripts/generate-category-tiles.ts             — все категории
 *  npx tsx scripts/generate-category-tiles.ts --only=nogti,parfyumeriya
 *  IMG_QUALITY=medium npx tsx scripts/generate-category-tiles.ts
 */
import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import OpenAI from "openai";

const OUT_DIR = join(process.cwd(), "public", "categories");
const MODEL = "gpt-image-1";
const SIZE = "1024x1024" as const;
const QUALITY = (process.env.IMG_QUALITY as "low" | "medium" | "high") ?? "high";

const COMMON_STYLE =
  "Editorial minimalist product photography, single square 1:1 frame. " +
  "Soft diffused natural light from upper-left, subtle shadows. " +
  "Muted premium palette: warm beige, off-white, cream, soft neutral. " +
  "Ultra-clean composition with generous negative space in the upper 40% of the frame " +
  "so a large dark headline can be overlaid later. " +
  "No text, no logos, no watermarks, no people, no hands. " +
  "Photorealistic, 4K, magazine-quality, luxury cosmetics brand mood.";

const TILES: { slug: string; concept: string }[] = [
  {
    slug: "makiyazh",
    concept:
      "An open eyeshadow palette with four nude/rose satin shades on the left, " +
      "and a slim lipstick with its cap removed lying at a slight angle on the right. " +
      "Placed on a warm beige matte surface. Subjects occupy the lower 55% of the frame.",
  },
  {
    slug: "uhod-za-litsom",
    concept:
      "A minimalist white ceramic cream jar with lid slightly ajar, " +
      "next to a glass serum dropper standing upright. " +
      "Placed on a soft off-white matte surface with a single fresh green leaf as a subtle accent. " +
      "Subjects occupy the lower 55% of the frame.",
  },
  {
    slug: "uhod-za-telom",
    concept:
      "A tall matte body lotion bottle standing upright on the right, " +
      "with a loosely folded natural linen towel in oatmeal beige on the left. " +
      "A single dried cotton stem as decor. Warm cream background. " +
      "Subjects occupy the lower 55% of the frame.",
  },
  {
    slug: "nogti",
    concept:
      "Three small glass nail polish bottles standing in a row, from left to right: " +
      "pale nude, dusty rose, deep burgundy. Reflective metallic caps. " +
      "Placed on a soft beige matte surface. " +
      "Subjects occupy the lower 45% of the frame, centered.",
  },
  {
    slug: "parfyumeriya",
    concept:
      "A single elegant transparent glass perfume flacon with amber liquid inside " +
      "and a heavy square cap, standing upright and slightly rotated. " +
      "A soft warm side light casts a long delicate shadow. " +
      "Neutral taupe-beige backdrop. Subject occupies the lower half of the frame, centered.",
  },
  {
    slug: "aksessuary",
    concept:
      "A fan-arrangement of five professional makeup brushes with pale wood handles " +
      "and cream-colored bristles, plus one soft round beauty sponge in blush pink. " +
      "Placed on a warm beige linen fabric surface. " +
      "Subjects occupy the lower 55% of the frame.",
  },
];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set. Add it to .env, then rerun.");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  await mkdir(OUT_DIR, { recursive: true });

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  let tiles = TILES;
  if (onlyArg) {
    const slugs = onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
    tiles = TILES.filter((t) => slugs.includes(t.slug));
    if (tiles.length === 0) {
      console.error(`Нет совпадений для --only=${slugs.join(",")}.`);
      process.exit(1);
    }
  }

  console.log(`Модель=${MODEL}, качество=${QUALITY}, размер=${SIZE}, категорий=${tiles.length}`);

  for (const tile of tiles) {
    const prompt = `${tile.concept}\n\n${COMMON_STYLE}`;
    const outPath = join(OUT_DIR, `${tile.slug}.jpg`);
    console.log(`→ ${tile.slug} …`);
    const t0 = Date.now();
    const resp = await openai.images.generate({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      n: 1,
    });
    const b64 = resp.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`  ✗ пустой ответ для ${tile.slug}`);
      continue;
    }
    await writeFile(outPath, Buffer.from(b64, "base64"));
    console.log(`  ✓ ${outPath} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
