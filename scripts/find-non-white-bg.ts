import { and, eq, isNull, sql } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { db } from "../src/db/client";
import { products } from "../src/db/schema";

const OUT_DIR = join(process.cwd(), "colored-bg");
const CONCURRENCY = 8;
// A pixel is "neutral" (white / gray shadow / almost-white) if channels
// are close to each other AND it's bright.
const NEUTRAL_CHROMA_MAX = 12; // max(R,G,B) - min(R,G,B) below this = neutral
const NEUTRAL_MIN_BRIGHTNESS = 210; // and max channel >= this = bright
// Image counts as "colored background" when a meaningful share of border
// pixels are chromatic (not near-white / not gray shadow).
const COLORED_FRACTION_MIN = 0.25;

type Row = { id: number; slug: string; name: string; images: string[] };

async function downloadImage(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function analyze(buf: Buffer): Promise<{ coloredFraction: number; verdict: "neutral" | "colored" }> {
  const img = sharp(buf).flatten({ background: "#ffffff" }); // handle transparent
  const { data, info } = await img
    .resize({ width: 200, height: 200, fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const border = 6;
  let total = 0;
  let colored = 0;

  const isColored = (o: number) => {
    const r = data[o]!;
    const g = data[o + 1]!;
    const b = data[o + 2]!;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const chroma = mx - mn;
    // Neutral = near-white or a gray shadow: low chroma & bright.
    // Colored = anything else (chromatic OR dark, e.g. dark product bg).
    const neutral = chroma < NEUTRAL_CHROMA_MAX && mx >= NEUTRAL_MIN_BRIGHTNESS;
    return !neutral;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= border && x < width - border && y >= border && y < height - border) continue;
      const o = (y * width + x) * channels;
      total++;
      if (isColored(o)) colored++;
    }
  }

  const frac = colored / total;
  return { coloredFraction: frac, verdict: frac >= COLORED_FRACTION_MIN ? "colored" : "neutral" };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const rows = (await db
    .select({ id: products.id, slug: products.slug, name: products.name, images: products.images })
    .from(products)
    .where(and(eq(products.isVisible, true), isNull(products.deletedAt), sql`jsonb_array_length(${products.images}) > 0`))) as Row[];

  console.log(`Analyzing ${rows.length} products…`);

  let matched = 0;
  let errors = 0;
  const report: string[] = [];

  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= rows.length) return;
      const p = rows[i]!;
      const url = p.images[0];
      if (!url) continue;
      try {
        const buf = await downloadImage(url);
        const { coloredFraction, verdict } = await analyze(buf);
        if (verdict === "colored") {
          matched++;
          const ext = url.split("?")[0]!.split(".").pop()?.toLowerCase();
          const safeExt = ext && ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
          const filename = `${p.id}-${p.slug}.${safeExt}`;
          await writeFile(join(OUT_DIR, filename), buf);
          const line = `#${p.id}  [colored ${(coloredFraction * 100).toFixed(0)}%]  ${p.name}`;
          report.push(line);
          console.log(line);
        }
      } catch (e) {
        errors++;
        console.warn(`  skip #${p.id} ${p.name}: ${(e as Error).message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeFile(
    join(OUT_DIR, "_report.txt"),
    [
      `Total analyzed: ${rows.length}`,
      `Colored bg:     ${matched}`,
      `Errors:         ${errors}`,
      `Threshold:      ≥${(COLORED_FRACTION_MIN * 100).toFixed(0)}% border pixels are chromatic (chroma≥${NEUTRAL_CHROMA_MAX} or brightness<${NEUTRAL_MIN_BRIGHTNESS})`,
      "",
      ...report,
    ].join("\n"),
  );

  console.log(`\nDone. Colored bg: ${matched}. Errors: ${errors}. Saved → ${OUT_DIR}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
