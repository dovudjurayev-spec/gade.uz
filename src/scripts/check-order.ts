import { db } from "@/db/client";
import { orders, paymentTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const os = await db.select().from(orders).orderBy(desc(orders.id)).limit(5);
  for (const o of os) {
    console.log(`#${o.number} id=${o.id} status=${o.status} pm=${o.paymentMethod} total=${o.totalTiyin} created=${o.createdAt.toISOString()} updated=${o.updatedAt.toISOString()}`);
    const txs = await db.select().from(paymentTransactions).where(eq(paymentTransactions.orderId, o.id));
    for (const t of txs) console.log(`  tx#${t.id} status=${t.status} provider=${t.provider} providerTx=${t.providerTxId}`);
  }
}
main().then(() => process.exit(0));
