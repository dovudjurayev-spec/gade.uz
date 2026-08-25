import { readdir, copyFile, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { products } from "../src/db/schema";

const IN_DIR = join(process.cwd(), "white-bg");
const PUB_DIR = join(process.cwd(), "public", "products");

async function main() {
  const apply = process.argv.includes("--apply");

  await mkdir(PUB_DIR, { recursive: true });

  const files = (await readdir(IN_DIR)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  console.log(`Found ${files.length} processed images${apply ? "" : " (dry-run)"}`);

  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const idStr = file.split("-")[0];
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      console.warn(`  skip ${file}: cannot parse product id`);
      skipped++;
      continue;
    }

    const ext = extname(file).toLowerCase().replace(".", "") || "png";
    const publicName = `${id}.${ext}`;
    const publicUrl = `/products/${publicName}`;

    const p = await db.query.products.findFirst({
      where: eq(products.id, id),
      columns: { id: true, name: true, images: true, imageFit: true },
    });
    if (!p) {
      console.warn(`  skip #${id} (${file}): product not found`);
      skipped++;
      continue;
    }

    const oldImages = p.images ?? [];
    const rest = oldImages.filter((u) => u !== publicUrl);
    const newImages = [publicUrl, ...rest];

    console.log(
      `  #${id}  ${p.name}\n     [${p.imageFit}] → [contain]  first: ${oldImages[0] ?? "(none)"} → ${publicUrl}`,
    );

    if (apply) {
      await copyFile(join(IN_DIR, file), join(PUB_DIR, publicName));
      await db
        .update(products)
        .set({ images: newImages, imageFit: "contain", updatedAt: new Date() })
        .where(eq(products.id, id));
      updated++;
    }
  }

  console.log(
    `\n${apply ? "Applied" : "Dry-run"}. ${apply ? `Updated: ${updated}` : `Would update: ${files.length - skipped}`}. Skipped: ${skipped}.`,
  );
  if (!apply) console.log("Pass --apply to write changes.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
