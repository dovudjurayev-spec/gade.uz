import { db } from "@/db/client";
import { products } from "@/db/schema";
import { eq, ilike, or } from "drizzle-orm";

// npx tsx --env-file=.env src/scripts/set-fiscal.ts <id|sku|barcode|name> [--ikpu=...] [--pkg=...] [--vat=0]
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: set-fiscal <id|sku|barcode|name-part> [--ikpu=XXX] [--pkg=YYY] [--vat=N]");
    process.exit(1);
  }
  const target = args[0]!;
  const opts: Record<string, string> = {};
  for (const a of args.slice(1)) {
    const m = a.match(/^--(\w+)=(.+)$/);
    if (m) opts[m[1]!] = m[2]!;
  }

  const idNum = Number(target);
  const found = await db
    .select({ id: products.id, name: products.name, sku: products.sku, ikpu: products.ikpu, packageCode: products.packageCode, vatPercent: products.vatPercent })
    .from(products)
    .where(
      Number.isFinite(idNum)
        ? eq(products.id, idNum)
        : or(eq(products.sku, target), eq(products.barcode, target), ilike(products.name, `%${target}%`))!,
    )
    .limit(10);

  if (found.length === 0) { console.error("Товар не найден"); process.exit(1); }
  if (found.length > 1) {
    console.log("Найдено несколько:");
    for (const p of found) console.log(`  #${p.id}  ${p.sku}  ${p.name}`);
    console.log("Уточни id / sku.");
    process.exit(1);
  }

  const p = found[0]!;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (opts.ikpu) patch.ikpu = opts.ikpu;
  if (opts.pkg) patch.packageCode = opts.pkg;
  if (opts.vat !== undefined) patch.vatPercent = Number(opts.vat);

  console.log(`До: #${p.id} ${p.name}`);
  console.log(`   ikpu=${p.ikpu ?? "-"}  pkg=${p.packageCode ?? "-"}  vat=${p.vatPercent}`);

  if (Object.keys(patch).length === 1) { console.log("Нет полей для обновления"); process.exit(0); }

  await db.update(products).set(patch).where(eq(products.id, p.id));
  const [after] = await db
    .select({ ikpu: products.ikpu, packageCode: products.packageCode, vatPercent: products.vatPercent })
    .from(products)
    .where(eq(products.id, p.id));
  console.log(`После: ikpu=${after!.ikpu ?? "-"}  pkg=${after!.packageCode ?? "-"}  vat=${after!.vatPercent}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
