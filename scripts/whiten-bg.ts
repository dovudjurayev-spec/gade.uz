import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const IN_DIR = join(process.cwd(), "colored-bg");
const OUT_DIR = join(process.cwd(), "white-bg");
const MODEL = "gpt-image-1";
const SIZE = "1024x1024" as const;
const CONCURRENCY = 3;
// low ≈ $0.011, medium ≈ $0.042, high ≈ $0.167 per 1024x1024 image
const QUALITY = (process.env.IMG_QUALITY as "low" | "medium" | "high") ?? "medium";

const PROMPT = [
  "From this input image, identify the single primary cosmetic product (the main bottle, tube, jar, palette, or applicator).",
  "Render ONLY that one product, isolated, standing upright, centered vertically and horizontally, on a pure white (#FFFFFF) seamless studio background.",
  "Remove and do not depict any of the following: marketing text, taglines, product-name overlays, brush strokes, powder swatches, cream smears, splashes, decorative props, secondary items, gradients, colored backgrounds, floors, surfaces, shadows on walls.",
  "Keep the product's real design intact: identical bottle shape, cap, label, brand logo, typography on the label, colors, materials, and proportions. Do not invent new text or graphics on the label.",
  "Add only a subtle, soft mirror reflection directly beneath the product, fading smoothly into pure white. No hard drop shadow, no floor line.",
  "Studio softbox lighting, neutral white balance, crisp edges, sharp focus, high micro-detail.",
  "Ultra-realistic, 4K, professional e-commerce catalog product photo.",
].join(" ");

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set. Add it to .env, then rerun.");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  await mkdir(OUT_DIR, { recursive: true });

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

        const res = await openai.images.edit({
          model: MODEL,
          image: upload,
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
