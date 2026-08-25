/**
 * Read-only diagnostic: explains WHY products are hidden.
 * Groups by the visibility rule: isVisible = (stock > 0) AND (price > 0).
 * Also samples raw BILLZ payload for a few hidden products to see per-shop pricing/stock.
 */
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull, sql as dsql } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { products } from "../src/db/schema";
import { fetchProductsPage } from "../src/lib/billz/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const sql = postgres(url, { max: 1, ssl: "require" });
const db = drizzle(sql, { schema });

async function main() {
  const shopId = process.env.BILLZ_SHOP_ID ?? "(not set)";
  console.log(`BILLZ_SHOP_ID = ${shopId}`);
  console.log("");

  const [breakdownRow] = await db
    .select({
      total: dsql<number>`count(*)::int`,
      hasBillz: dsql<number>`count(*) FILTER (WHERE ${products.billzId} IS NOT NULL)::int`,
      deleted: dsql<number>`count(*) FILTER (WHERE ${products.deletedAt} IS NOT NULL)::int`,
      visible: dsql<number>`count(*) FILTER (WHERE ${products.isVisible} = true AND ${products.deletedAt} IS NULL)::int`,
      hiddenNoStock: dsql<number>`count(*) FILTER (WHERE ${products.isVisible} = false AND ${products.stock} <= 0 AND ${products.priceTiyin} > 0 AND ${products.deletedAt} IS NULL)::int`,
      hiddenNoPrice: dsql<number>`count(*) FILTER (WHERE ${products.isVisible} = false AND ${products.priceTiyin} <= 0 AND ${products.stock} > 0 AND ${products.deletedAt} IS NULL)::int`,
      hiddenBoth: dsql<number>`count(*) FILTER (WHERE ${products.isVisible} = false AND ${products.stock} <= 0 AND ${products.priceTiyin} <= 0 AND ${products.deletedAt} IS NULL)::int`,
    })
    .from(products);

  if (!breakdownRow) throw new Error("no breakdown row");
  const breakdown = breakdownRow;
  console.log("BREAKDOWN OF PRODUCTS IN DB:");
  console.log(`  Total rows:                 ${breakdown.total}`);
  console.log(`  From BILLZ (has billzId):   ${breakdown.hasBillz}`);
  console.log(`  Soft-deleted:               ${breakdown.deleted}`);
  console.log(`  Visible on site:            ${breakdown.visible}`);
  console.log(`  Hidden — stock=0, price>0:  ${breakdown.hiddenNoStock}`);
  console.log(`  Hidden — price=0, stock>0:  ${breakdown.hiddenNoPrice}`);
  console.log(`  Hidden — BOTH stock=0 & price=0: ${breakdown.hiddenBoth}`);
  console.log("");

  // Sample 3 hidden products, fetch fresh BILLZ data, show per-shop pricing/stock
  const hiddenSamples = await db
    .select({ id: products.id, name: products.name, billzId: products.billzId, stock: products.stock, priceTiyin: products.priceTiyin })
    .from(products)
    .where(
      and(
        eq(products.isVisible, false),
        isNull(products.deletedAt),
      ),
    )
    .limit(3);

  console.log("SAMPLES — fetching fresh BILLZ data for 3 hidden products:");
  console.log("(shows per-shop retail price + stock — helps see if OUR shop has data)");
  console.log("");

  // Fetch a couple of pages to increase chance of finding samples
  const billzMap = new Map<string, any>();
  for (let p = 1; p <= 3; p++) {
    try {
      const resp = await fetchProductsPage(p, 100);
      for (const bp of resp.products) billzMap.set(bp.id, bp);
    } catch (e) {
      console.log(`(page ${p} fetch failed: ${(e as Error).message})`);
    }
  }

  for (const s of hiddenSamples) {
    console.log(`--- [${s.id}] ${s.name}  (billzId=${s.billzId})`);
    console.log(`  In our DB: stock=${s.stock}, priceTiyin=${s.priceTiyin}`);
    const bp = s.billzId ? billzMap.get(s.billzId) : null;
    if (!bp) {
      console.log(`  BILLZ payload not found in first 300 products — skipping raw dump`);
      continue;
    }
    console.log(`  BILLZ shop_prices:`);
    for (const sp of bp.shop_prices ?? []) {
      const marker = sp.shop_id === shopId ? " <-- OUR SHOP" : "";
      console.log(`    shop=${sp.shop_id.slice(0, 8)}…  retail=${sp.retail_price}  promo=${sp.promo_price}${marker}`);
    }
    console.log(`  BILLZ shop_measurement_values (stock):`);
    for (const sv of bp.shop_measurement_values ?? []) {
      const marker = sv.shop_id === shopId ? " <-- OUR SHOP" : "";
      console.log(`    shop=${sv.shop_id.slice(0, 8)}…  active=${sv.active_measurement_value}${marker}`);
    }
    console.log("");
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
