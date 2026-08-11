"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { customerAddresses } from "@/db/schema";
import { getCurrentCustomer } from "@/lib/customer-auth";

const schema = z.object({
  label: z.string().max(100).optional(),
  city: z.string().min(1).max(100),
  district: z.string().max(100).optional(),
  street: z.string().min(1).max(300),
  apartment: z.string().max(50).optional(),
  comment: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export async function createAddressAction(input: unknown) {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false as const, error: "unauthorized" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "bad_request" };

  await db.transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, customer.id));
    }
    await tx.insert(customerAddresses).values({ ...parsed.data, customerId: customer.id });
  });
  revalidatePath("/account/addresses");
  return { ok: true as const };
}

export async function deleteAddressAction(id: number): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await db.delete(customerAddresses).where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)));
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(id: number): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await db.transaction(async (tx) => {
    await tx.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, customer.id));
    await tx.update(customerAddresses).set({ isDefault: true }).where(and(eq(customerAddresses.id, id), eq(customerAddresses.customerId, customer.id)));
  });
  revalidatePath("/account/addresses");
}
