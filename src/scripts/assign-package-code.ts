import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

// Для каждого уникального ИКПУ дёргаем tasnif.soliq.uz, выбираем «лучший»
// package_code и одним UPDATE проставляем всем товарам с этим ИКПУ.
//
// Приоритет контейнеров (containerCode из tasnif):
//   40  iste'mol qutisi (потребительская коробка) — самый ходовой
//   9   tuba (тюбик)
//   4   blister
//   —   базовая «dona» (без container) как fallback
const CONTAINER_PRIORITY = [40, 9, 4];

type Package = {
  code: number;
  containerCode: number | null;
  containerName: string | null;
};

type TasnifResponse = { packages?: Package[] } | null;

async function fetchPackages(ikpu: string): Promise<Package[]> {
  const url = `https://tasnif.soliq.uz/api/cls-api/mxik/get/by-mxik?mxikCode=${ikpu}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as TasnifResponse;
  return json?.packages ?? [];
}

function pickPackage(pkgs: Package[]): Package | null {
  if (pkgs.length === 0) return null;
  for (const cc of CONTAINER_PRIORITY) {
    const hit = pkgs.find((p) => p.containerCode === cc);
    if (hit) return hit;
  }
  // Fallback: базовая единица (containerCode = null)
  const base = pkgs.find((p) => p.containerCode == null);
  if (base) return base;
  return pkgs[0]!;
}

async function main() {
  const rows = await db
    .select({ id: products.id, ikpu: products.ikpu, packageCode: products.packageCode })
    .from(products)
    .where(and(isNull(products.deletedAt), isNotNull(products.ikpu)));

  const idsByIkpu = new Map<string, number[]>();
  for (const p of rows) {
    if (!p.ikpu) continue;
    if (p.packageCode && p.packageCode !== "0000001") continue; // уже проставлен
    if (!idsByIkpu.has(p.ikpu)) idsByIkpu.set(p.ikpu, []);
    idsByIkpu.get(p.ikpu)!.push(p.id);
  }

  console.log(`Уникальных ИКПУ без package_code: ${idsByIkpu.size}`);
  console.log(`Товаров к обновлению: ${rows.filter((r) => !r.packageCode || r.packageCode === "0000001").length}`);

  let updated = 0;
  const misses: string[] = [];

  for (const [ikpu, ids] of idsByIkpu) {
    const pkgs = await fetchPackages(ikpu);
    const chosen = pickPackage(pkgs);
    if (!chosen) {
      misses.push(ikpu);
      console.log(`  ${ikpu}: пакетов нет`);
      continue;
    }
    const pkgStr = String(chosen.code);
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await db
        .update(products)
        .set({ packageCode: pkgStr, updatedAt: new Date() })
        .where(inArray(products.id, chunk));
      updated += chunk.length;
    }
    console.log(`  ${ikpu} → ${pkgStr} (${chosen.containerName ?? "dona"}) × ${ids.length}`);
    await new Promise((r) => setTimeout(r, 150)); // не долбим tasnif
  }

  console.log(`\npackage_code проставлен: ${updated}`);
  if (misses.length > 0) {
    console.log(`Без пакетов на tasnif: ${misses.length}`);
    for (const m of misses) console.log(`  ${m}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
