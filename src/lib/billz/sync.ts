import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { and, eq, inArray, isNotNull, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db/client";
import { brandLines, categories, products } from "@/db/schema";
import {
  fetchProductsPage,
  type BillzProduct,
} from "./client";

const PAGE_SIZE = 100;
const IMAGES_DIR = join(process.cwd(), "public", "products");

function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(url: string, billzId: string, idx: number): Promise<string | null> {
  if (!url) return null;
  const cleanUrl = url.split("?")[0] ?? url;
  const ext = (cleanUrl.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const safeExt = /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg";
  const fileName = `${billzId}-${idx}.${safeExt}`;
  const filePath = join(IMAGES_DIR, fileName);
  const publicPath = `/products/${fileName}`;

  if (await fileExists(filePath)) return publicPath;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(filePath, buf);
    return publicPath;
  } catch {
    return null;
  }
}

async function ensureCategory(billzCat: { id: string; name: string } | undefined) {
  if (!billzCat?.name) return null;
  const slug = slugify(billzCat.name) || `cat-${billzCat.id.slice(0, 8)}`;
  const existing = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(categories)
    .values({ slug, name: billzCat.name })
    .returning({ id: categories.id });
  return inserted[0]?.id ?? null;
}

async function ensureBrand(brandId: string, brandName: string) {
  if (!brandName) return null;
  const slug = slugify(brandName) || `brand-${brandId.slice(0, 8)}`;
  const existing = await db.select().from(brandLines).where(eq(brandLines.slug, slug)).limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(brandLines)
    .values({ slug, name: brandName })
    .returning({ id: brandLines.id });
  return inserted[0]?.id ?? null;
}

export type SyncResult = {
  totalFromBillz: number;
  upserted: number;
  hiddenNoStock: number;
  skipped: number;
  imagesDownloaded: number;
  softDeleted: number;
  restored: number;
  errors: string[];
};

export async function syncBillzCatalog(): Promise<SyncResult> {
  const shopId = process.env.BILLZ_SHOP_ID;
  if (!shopId) throw new Error("BILLZ_SHOP_ID is not set");

  await mkdir(IMAGES_DIR, { recursive: true });

  const result: SyncResult = {
    totalFromBillz: 0,
    upserted: 0,
    hiddenNoStock: 0,
    skipped: 0,
    imagesDownloaded: 0,
    softDeleted: 0,
    restored: 0,
    errors: [],
  };

  const seenBillzIds: string[] = [];
  let page = 1;
  let totalCount = Infinity;

  while ((page - 1) * PAGE_SIZE < totalCount) {
    const resp = await fetchProductsPage(page, PAGE_SIZE);
    totalCount = resp.count;
    result.totalFromBillz = totalCount;

    for (const p of resp.products) {
      seenBillzIds.push(p.id);
      try {
        const changed = await upsertProduct(p, shopId, result);
        if (changed) result.upserted += 1;
        else result.skipped += 1;
      } catch (e) {
        result.errors.push(`${p.id} (${p.sku}): ${(e as Error).message}`);
      }
    }
    page += 1;
  }

  // Soft-delete products that exist in DB but disappeared from Billz.
  // Only touch billz-origin rows (billz_id IS NOT NULL) — seed products stay.
  if (seenBillzIds.length > 0) {
    const now = new Date();
    const missing = await db
      .update(products)
      .set({ deletedAt: now, isVisible: false, updatedAt: now })
      .where(
        and(
          isNotNull(products.billzId),
          isNull(products.deletedAt),
          notInArray(products.billzId, seenBillzIds),
        ),
      )
      .returning({ id: products.id });
    result.softDeleted = missing.length;

    // Restore rows that reappeared in Billz after being marked deleted.
    const restored = await db
      .update(products)
      .set({ deletedAt: null, updatedAt: now })
      .where(and(isNotNull(products.deletedAt), inArray(products.billzId, seenBillzIds)))
      .returning({ id: products.id });
    result.restored = restored.length;
  }

  return result;
}

async function upsertProduct(p: BillzProduct, shopId: string, result: SyncResult): Promise<boolean> {
  const priceEntry = p.shop_prices?.find((s) => s.shop_id === shopId);
  const stockEntry = p.shop_measurement_values?.find((s) => s.shop_id === shopId);

  const retailUzs = priceEntry?.retail_price ?? 0;
  const promoUzs = priceEntry?.promo_price ?? 0;
  const stock = stockEntry?.active_measurement_value ?? 0;

  const priceTiyin = retailUzs * 100;
  const oldPriceTiyin = promoUzs > 0 && promoUzs < retailUzs ? retailUzs * 100 : null;
  const finalPriceTiyin = promoUzs > 0 && promoUzs < retailUzs ? promoUzs * 100 : priceTiyin;

  const isVisible = stock > 0 && retailUzs > 0;
  if (!isVisible) result.hiddenNoStock += 1;

  const categoryId = await ensureCategory(p.categories?.[0]);
  const brandLineId = await ensureBrand(p.brand_id, p.brand_name);

  const imgs: string[] = [];
  const mainImg = p.main_image_url_full;
  if (mainImg) {
    const local = await downloadImage(mainImg, p.id, 0);
    if (local) {
      imgs.push(local);
      result.imagesDownloaded += 1;
    }
  }
  const photoList = p.photos ?? [];
  for (let i = 0; i < photoList.length; i++) {
    const photo = photoList[i];
    const url = photo?.photo_url_full ?? photo?.photo_url;
    if (!url || url === mainImg) continue;
    const local = await downloadImage(url, p.id, i + 1);
    if (local) {
      imgs.push(local);
      result.imagesDownloaded += 1;
    }
  }

  const billzShort = p.id.replace(/-/g, "").slice(0, 8);
  const baseSlug = slugify(p.name) || "product";
  const slug = `${baseSlug}-${billzShort}`.slice(0, 200);
  const rawSku = (p.sku || p.barcode || "").trim();
  const sku = (rawSku ? `${rawSku}-${billzShort}` : billzShort).slice(0, 64);

  const existing = await db
    .select({ id: products.id, images: products.images })
    .from(products)
    .where(eq(products.billzId, p.id))
    .limit(1);

  const values = {
    slug,
    sku,
    name: p.name.slice(0, 300),
    categoryId,
    brandLineId,
    description: p.description || null,
    priceTiyin: finalPriceTiyin,
    oldPriceTiyin,
    stock,
    isVisible,
    images: imgs.length > 0 ? imgs : existing[0]?.images ?? [],
    billzId: p.id,
    barcode: p.barcode || null,
    billzUpdatedAt: p.updated_at ? new Date(p.updated_at.replace(" ", "T") + "Z") : null,
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(products).set(values).where(eq(products.id, existing[0].id));
  } else {
    await db.insert(products).values(values);
  }
  return true;
}
