import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

const KEY = "payme_merchant_password";

export async function getStoredPaymePassword(): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, KEY) });
  if (!row) return null;
  const val = row.value as { password?: string } | null;
  return val?.password ?? null;
}

export async function setStoredPaymePassword(password: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key: KEY, value: { password } })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: { password }, updatedAt: new Date() },
    });
}
