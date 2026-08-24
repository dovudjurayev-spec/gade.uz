import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings } from "@/db/schema";

export type SiteSettings = {
  courierBaseSum: number;
  courierPerKmSum: number;
  regionCostSum: number;
  freeDeliveryThresholdSum: number;
  phone: string;
  telegramUrl: string;
  address: string;
  telegramOrdersChatId: string;
  telegramTechChatId: string;
  heroTitle: string;
  heroSubtitle: string;
};

const DEFAULTS: SiteSettings = {
  courierBaseSum: 20_000,
  courierPerKmSum: 3_000,
  regionCostSum: 45_000,
  freeDeliveryThresholdSum: 500_000,
  phone: "+998 90 167 50 04",
  telegramUrl: "https://t.me/gadeuz",
  address: "Мирабадский пр. 64В, Ташкент",
  telegramOrdersChatId: "1261400422",
  telegramTechChatId: "1261400422",
  heroTitle: "GA-DE Cosmetics в Узбекистане",
  heroSubtitle:
    "Профессиональная косметика, которой пользуются лучшие салоны Ташкента. Теперь напрямую вам, с доставкой на дом.",
};

const KEY = "site_settings";

export async function getSettings(): Promise<SiteSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, KEY) });
  if (!row) return DEFAULTS;
  return { ...DEFAULTS, ...(row.value as Partial<SiteSettings>) };
}

export async function saveSettings(value: SiteSettings): Promise<void> {
  await db
    .insert(settings)
    .values({ key: KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}
