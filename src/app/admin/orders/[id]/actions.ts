"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { ORDER_STATUS_LABEL } from "@/lib/order-labels";

export async function updateOrderStatusAction(input: { orderId: number; status: string }) {
  try {
    await requireAdmin();
  } catch {
    return { ok: false as const, error: "Нет доступа" };
  }
  if (!ORDER_STATUS_LABEL[input.status]) {
    return { ok: false as const, error: "Неизвестный статус" };
  }
  await db
    .update(orders)
    .set({ status: input.status as never, updatedAt: new Date() })
    .where(eq(orders.id, input.orderId));

  revalidatePath(`/admin/orders/${input.orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true as const };
}
