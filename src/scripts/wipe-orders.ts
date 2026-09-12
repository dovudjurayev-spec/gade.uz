import { db } from "@/db/client";
import { orders, orderItems, paymentTransactions } from "@/db/schema";

async function main() {
  const tx = await db.delete(paymentTransactions).returning({ id: paymentTransactions.id });
  const it = await db.delete(orderItems).returning({ id: orderItems.id });
  const or = await db.delete(orders).returning({ id: orders.id });
  console.log(`deleted: payment_transactions=${tx.length}, order_items=${it.length}, orders=${or.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
