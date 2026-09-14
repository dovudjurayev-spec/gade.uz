import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER SEQUENCE orders_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE order_items_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE payment_transactions_id_seq RESTART WITH 1`);
  console.log("Sequences reset: orders / order_items / payment_transactions → 1");
}
main().then(() => process.exit(0));
