/**
 * Диагностика: находит первый Billz-товар с именем, содержащим искомую строку,
 * и печатает полный JSON. Задача — увидеть под какими ключами приходят
 * "под_подкатегория" и "под_под_категория".
 *
 * Запуск: npx tsx scripts/inspect-billz-product.ts "Crystal Lights"
 */
import "dotenv/config";
import { billzFetch } from "../src/lib/billz/client";

async function main() {
  const needle = (process.argv[2] ?? "Crystal Lights").toLowerCase();
  const limit = 100;
  let page = 1;
  let scanned = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await billzFetch<{ count: number; products: unknown[] }>(
      `/v2/products?page=${page}&limit=${limit}`,
    );
    const list = resp.products as { name?: string }[];
    if (list.length === 0) break;

    for (const p of list) {
      scanned++;
      if (typeof p.name === "string" && p.name.toLowerCase().includes(needle)) {
        console.log(`--- Найден на странице ${page} после ${scanned} товаров ---`);
        console.log(JSON.stringify(p, null, 2));
        console.log("\n--- Все ключи верхнего уровня ---");
        console.log(Object.keys(p as object).sort().join(", "));
        return;
      }
    }
    if (list.length < limit) break;
    page++;
    if (page > 100) break;
  }

  console.log(`Ничего не найдено по "${needle}" за ${scanned} товаров.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
