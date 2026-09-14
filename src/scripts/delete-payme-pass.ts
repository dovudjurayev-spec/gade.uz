import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const res = await db.delete(settings).where(eq(settings.key, "payme_merchant_password")).returning();
  console.log("Deleted rows:", res.length, res);
}
main().then(() => process.exit(0));
