import "dotenv/config";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const IN_DIR = join(process.cwd(), "colored-bg");
const OUT_DIR = join(process.cwd(), "white-bg");
const LOGO_PATH = join(process.cwd(), "public", "logo.png");
const MODEL = "gpt-image-1";
const SIZE = "1024x1024" as const;
const CONCURRENCY = 3;
// low ≈ $0.011, medium ≈ $0.042, high ≈ $0.167 per 1024x1024 image
const QUALITY = (process.env.IMG_QUALITY as "low" | "medium" | "high") ?? "high";

const PROMPT = [
  // Задача
  "TASK: Re-photograph the single primary cosmetic product from the input image on a clean white studio background. This is a pixel-faithful re-photograph, NOT a re-imagining.",

  // Что рендерить
  "SUBJECT: Identify the one main product (bottle, tube, jar, palette, compact, applicator). Ignore any secondary items, swatches, powder puffs, brushes-as-props, smears, splashes, decorative surfaces. Render only that one product, upright, perfectly centered horizontally and vertically, occupying roughly 78-85% of the frame height.",

  // Фон и свет
  "BACKGROUND: Pure white #FFFFFF, seamless, no gradient, no colored tint, no floor line, no wall. Add only a very subtle soft mirror reflection directly beneath the product base, fading to pure white within a few pixels. No hard drop shadow.",
  "LIGHTING: Even studio softbox lighting from above and slightly front, neutral 5500K white balance, gentle specular highlights on glossy surfaces, no color cast.",

  // КРИТИЧНО: текст и лого
  "TEXT & LOGO — HIGHEST PRIORITY: The product label carries brand name, product name, volume and other typography. Reproduce every character, glyph and logo mark EXACTLY as it appears on the source: same letters, same spelling, same case, same kerning, same font weight, same stroke thickness, same color, same placement, same orientation.",
  "Do NOT stylize, translate, paraphrase, re-letter, re-align, restyle, thicken, italicize, or 'clean up' any text. Do NOT invent decorative words. Do NOT substitute similar-looking Latin/Cyrillic characters.",
  "Typography must be crisp and sharply in focus — vector-clean edges, no motion blur, no diffusion, no softening, no bokeh on the label area. Small caps and thin serifs must remain legible pixel-for-pixel.",
  "If a portion of the source text is genuinely unreadable (glare, angle, low resolution), keep it as an out-of-focus blur in the SAME position — do NOT hallucinate replacement letters.",

  // Ссылка на эталонный логотип (передаётся вторым изображением)
  "GA-DE LOGO REFERENCE: The SECOND input image is the authoritative GA-DE brand wordmark — an elegant thin serif logotype spelling 'GA-DE' with a hyphen. Wherever the GA-DE logo appears on the product, reproduce it using EXACTLY this reference wordmark: same elegant serif letterforms, same thin strokes, same proportions of 'GA', '-', 'DE'. Do NOT substitute a generic sans-serif font. Do NOT bolden. Do NOT re-space. Scale, rotate and color-match the reference logo to the position it occupies on the product, then paste it in pixel-clean.",
  "For any other logos or wordmarks present on the product (e.g. sub-line names like ICON, REVITALIST, IDYLLIC, GOLDEN, LUMINITY), preserve their original custom letterforms from the source photo exactly — no font substitution.",

  // Форма и материалы
  "GEOMETRY: Preserve the real product silhouette 1:1 — bottle contour, cap shape, pump/nozzle, dropper, palette hinge, applicator, mirror. Do NOT slim, elongate, round, or restyle the shape. Keep the exact aspect ratio of the physical object.",
  "MATERIALS & COLOR: Preserve real surface materials (glass, frosted glass, aluminum, plastic, cardboard, acrylic), real product color, real cream/lipstick/nail-polish shade. Match hue and saturation exactly. Metallic caps stay metallic, matte stays matte, glossy stays glossy.",

  // Качество
  "OUTPUT: Ultra-sharp e-commerce catalog photo, 4K quality, high micro-detail on cap threads, embossed logos, and printed text. Photographic realism only — no illustration, no CGI stylization, no smoothing filter.",
].join(" ");

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set. Add it to .env, then rerun.");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  await mkdir(OUT_DIR, { recursive: true });

  // Эталонный логотип GA-DE — передаётся вторым изображением в каждый запрос,
  // чтобы модель воспроизводила фирменный тонкий serif, а не generic sans.
  const logoBuf = await readFile(LOGO_PATH).catch(() => {
    throw new Error(`Logo reference not found at ${LOGO_PATH}. Put GA-DE wordmark PNG there.`);
  });

  const all = await readdir(IN_DIR);
  let files = all.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const exceptArg = process.argv.find((a) => a.startsWith("--except="));
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  if (onlyArg) {
    const ids = onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean);
    files = files.filter((f) => ids.some((id) => f.startsWith(`${id}-`)));
    if (files.length === 0) {
      console.error(`No files match --only=${ids.join(",")}. Files start with the product id, e.g. 1278-*.jpg`);
      process.exit(1);
    }
  } else if (exceptArg) {
    const ids = exceptArg.slice("--except=".length).split(",").map((s) => s.trim()).filter(Boolean);
    files = files.filter((f) => !ids.some((id) => f.startsWith(`${id}-`)));
  }
  if (limitArg) {
    const n = Number(limitArg.slice("--limit=".length));
    if (Number.isFinite(n) && n > 0) files = files.slice(0, n);
  }

  // Skip files that already exist in OUT_DIR (safe to resume interrupted runs)
  const skipExisting = !process.argv.includes("--force");
  if (skipExisting) {
    const existing = new Set(
      (await readdir(OUT_DIR).catch(() => [] as string[])).map((f) => basename(f, extname(f))),
    );
    files = files.filter((f) => !existing.has(basename(f, extname(f))));
  }

  console.log(`Processing ${files.length} images (quality=${QUALITY}) from ${IN_DIR} → ${OUT_DIR}`);

  let done = 0;
  let failed = 0;
  const failures: string[] = [];

  let cursor = 0;
  async function worker(workerId: number) {
    while (true) {
      const i = cursor++;
      if (i >= files.length) return;
      const file = files[i]!;
      const inPath = join(IN_DIR, file);
      const outPath = join(OUT_DIR, `${basename(file, extname(file))}.png`);

      try {
        const buf = await readFile(inPath);
        const upload = await toFile(buf, file, {
          type: extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg",
        });
        // Каждому запросу нужен свой toFile-хендл (стрим одноразовый).
        const logoUpload = await toFile(logoBuf, "ga-de-logo.png", { type: "image/png" });

        const res = await openai.images.edit({
          model: MODEL,
          image: [upload, logoUpload],
          prompt: PROMPT,
          size: SIZE,
          quality: QUALITY,
          n: 1,
        });

        const b64 = res.data?.[0]?.b64_json;
        if (!b64) throw new Error("no image data in response");
        await writeFile(outPath, Buffer.from(b64, "base64"));

        done++;
        console.log(`[w${workerId}] ${done}/${files.length}  ✓ ${file}`);
      } catch (e) {
        failed++;
        const msg = (e as Error).message;
        failures.push(`${file}: ${msg}`);
        console.warn(`[w${workerId}]           ✗ ${file}: ${msg}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));

  if (failures.length) {
    await writeFile(join(OUT_DIR, "_failures.txt"), failures.join("\n"));
  }
  console.log(`\nDone. Success: ${done}, Failed: ${failed}. Saved → ${OUT_DIR}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
