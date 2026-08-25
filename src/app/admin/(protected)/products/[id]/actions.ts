"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

type UpdateInput = {
  id: number;
  name: string;
  description: string;
  ingredients: string;
  usage: string;
  hairType: string;
  skinType: string;
  images: string[];
  imageFit: "contain" | "cover";
  isFeatured: boolean;
  isNew: boolean;
  isVisible: boolean;
};

export async function updateProductAction(input: UpdateInput) {
  try {
    await requireAdmin();
  } catch {
    return { ok: false as const, error: "Нет доступа" };
  }
  if (!input.name.trim()) return { ok: false as const, error: "Название обязательно" };

  await db
    .update(products)
    .set({
      name: input.name.trim(),
      description: input.description || null,
      ingredients: input.ingredients || null,
      usage: input.usage || null,
      hairType: input.hairType || null,
      skinType: input.skinType || null,
      images: input.images,
      imageFit: input.imageFit === "cover" ? "cover" : "contain",
      isFeatured: input.isFeatured,
      isNew: input.isNew,
      isVisible: input.isVisible,
      updatedAt: new Date(),
    })
    .where(eq(products.id, input.id));

  revalidatePath(`/admin/products/${input.id}`);
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  return { ok: true as const };
}
