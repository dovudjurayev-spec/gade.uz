"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { promoCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { sumToTiyin } from "@/lib/money";

export async function createPromoAction(input: {
  code: string; discountPercent?: number; minOrderSum: number; usageLimit?: number;
}) {
  try { await requireAdmin(); } catch { return { ok: false as const, error: "Нет доступа" }; }
  if (!input.code.match(/^[A-Z0-9_-]{3,32}$/)) {
    return { ok: false as const, error: "Код: латиница, цифры, 3-32 символа" };
  }
  if (input.discountPercent != null && (input.discountPercent < 1 || input.discountPercent > 100)) {
    return { ok: false as const, error: "Скидка от 1 до 100%" };
  }

  await db.insert(promoCodes).values({
    code: input.code,
    discountPercent: input.discountPercent ?? null,
    minOrderTiyin: sumToTiyin(input.minOrderSum),
    usageLimit: input.usageLimit ?? null,
    isActive: true,
  }).onConflictDoNothing();

  revalidatePath("/admin/promo");
  return { ok: true as const };
}

export async function updatePromoAction(input: { id: number; isActive?: boolean }) {
  try { await requireAdmin(); } catch { return { ok: false as const, error: "Нет доступа" }; }
  const patch: { isActive?: boolean } = {};
  if (typeof input.isActive === "boolean") patch.isActive = input.isActive;
  if (Object.keys(patch).length) {
    await db.update(promoCodes).set(patch).where(eq(promoCodes.id, input.id));
  }
  revalidatePath("/admin/promo");
  return { ok: true as const };
}

export async function deletePromoAction(input: { id: number }) {
  try { await requireAdmin(); } catch { return { ok: false as const, error: "Нет доступа" }; }
  await db.delete(promoCodes).where(eq(promoCodes.id, input.id));
  revalidatePath("/admin/promo");
  return { ok: true as const };
}
