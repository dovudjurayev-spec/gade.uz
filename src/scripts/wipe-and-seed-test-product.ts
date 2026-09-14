import { db } from "@/db/client";
import { orders, paymentTransactions, products } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const txs = await db.delete(paymentTransactions).returning({ id: paymentTransactions.id });
  const del = await db.delete(orders).returning({ id: orders.id });
  console.log(`Deleted: ${del.length} orders, ${txs.length} payment_transactions`);

  const slug = "test-1000";
  const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (existing) {
    const [u] = await db
      .update(products)
      .set({
        priceTiyin: 100000,
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
        sku: "TEST-1000",
        name: "Тестовый товар 1000 сум",
        description: "Тестовый товар для проверки оплаты.",
        priceTiyin: 100000,
        stock: 999,
        isVisible: true,
        images: [],
      })
      .returning({ id: products.id, slug: products.slug });
    console.log("Created test product:", ins);
  }
}
main().then(() => process.exit(0));
