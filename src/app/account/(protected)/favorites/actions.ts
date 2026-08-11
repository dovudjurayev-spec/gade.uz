"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { favorites } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";

export async function removeFavoriteAction(productId: number): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await db.delete(favorites).where(and(eq(favorites.customerId, customer.id), eq(favorites.productId, productId)));
  revalidatePath("/account/favorites");
}
