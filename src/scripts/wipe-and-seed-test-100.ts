import { db } from "@/db/client";
import { orderItems, orders, paymentTransactions, products } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const items = await db.delete(orderItems).returning({ id: orderItems.id });
  const txs = await db.delete(paymentTransactions).returning({ id: paymentTransactions.id });
  const del = await db.delete(orders).returning({ id: orders.id });
  console.log(
    `Deleted: ${del.length} orders, ${items.length} order_items, ${txs.length} payment_transactions`,
  );

  const oldSlug = "test-1000";
  const oldProduct = await db.query.products.findFirst({ where: eq(products.slug, oldSlug) });
  if (oldProduct) {
    await db.delete(products).where(eq(products.id, oldProduct.id));
    console.log(`Removed old test product #${oldProduct.id} (${oldSlug})`);
  }

  const slug = "test-100";
  const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (existing) {
    const [u] = await db
      .update(products)
      .set({
        priceTiyin: 10000,
        oldPriceTiyin: null,
        stock: 999,
        isVisible: true,
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, existing.id))
      .returning({ id: products.id, slug: products.slug });
    console.log("Updated test product:", u);
  } else {
    const [ins] = await db
      .insert(products)
      .values({
        slug,
        sku: "TEST-100",
        name: "Тестовый товар 100 сум",
        description: "Тестовый товар для проверки оплаты.",
        priceTiyin: 10000,
        stock: 999,
        isVisible: true,
        images: [],
      })
      .returning({ id: products.id, slug: products.slug });
    console.log("Created test product:", ins);
  }
}
main().then(() => process.exit(0));
