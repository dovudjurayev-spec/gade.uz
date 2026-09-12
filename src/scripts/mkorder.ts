import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const [o] = await db
    .insert(orders)
    .values({
      number: "T" + Date.now().toString().slice(-9),
      customerName: "Payme Sandbox",
      customerPhone: "+998900000000",
      paymentMethod: "payme",
      deliveryMethod: "pickup",
      subtotalTiyin: 500000,
      totalTiyin: 500000,
    })
    .returning({ id: orders.id, number: orders.number, totalTiyin: orders.totalTiyin });
  console.log("CREATED:", JSON.stringify(o));

  const rows = await db
    .select({ id: orders.id, number: orders.number, totalTiyin: orders.totalTiyin, status: orders.status, method: orders.paymentMethod })
    .from(orders)
    .orderBy(desc(orders.id))
    .limit(3);
  console.log("RECENT:", JSON.stringify(rows, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
