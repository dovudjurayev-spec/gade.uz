import "server-only";
import { getSettings } from "@/services/settings";
import type { DeliveryTariff } from "@/lib/delivery";

export async function loadDeliveryTariff(): Promise<DeliveryTariff> {
  const s = await getSettings();
  return {
    baseTiyin: s.courierBaseSum * 100,
    perKmTiyin: s.courierPerKmSum * 100,
    freeThresholdTiyin: s.freeDeliveryThresholdSum * 100,
    regionTiyin: s.regionCostSum * 100,
  };
}
