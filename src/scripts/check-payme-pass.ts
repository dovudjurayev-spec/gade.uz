import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "payme_merchant_password") });
  console.log("Stored payme password row:", JSON.stringify(row));
}
main().then(() => process.exit(0));
