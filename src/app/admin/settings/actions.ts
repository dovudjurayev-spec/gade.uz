"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { saveSettings, type SiteSettings } from "@/services/settings";

export async function saveSettingsAction(input: SiteSettings) {
  try { await requireAdmin(); } catch { return { ok: false as const, error: "Нет доступа" }; }
  await saveSettings(input);
  revalidatePath("/");
  return { ok: true as const };
}
