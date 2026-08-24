// Delivery pricing: base + per-km, free for courier above threshold.
// Server enforces the price — client-side quote is advisory only.
// Tariff values come from admin settings; constants below are fallbacks.

export const WAREHOUSE = {
  lat: 41.29249,
  lng: 69.28703,
  address: "Мирабадский пр. 64В, Ташкент",
};

export const DELIVERY_BASE_TIYIN = 20_000_00;
export const DELIVERY_PER_KM_TIYIN = 3_000_00;
export const FREE_DELIVERY_THRESHOLD_TIYIN = 500_000_00;
export const REGION_DELIVERY_TIYIN = 45_000_00;

export type DeliveryTariff = {
  baseTiyin: number;
  perKmTiyin: number;
  freeThresholdTiyin: number;
  regionTiyin: number;
};

export const DEFAULT_TARIFF: DeliveryTariff = {
  baseTiyin: DELIVERY_BASE_TIYIN,
  perKmTiyin: DELIVERY_PER_KM_TIYIN,
  freeThresholdTiyin: FREE_DELIVERY_THRESHOLD_TIYIN,
  regionTiyin: REGION_DELIVERY_TIYIN,
};

// Straight-line → road distance correction factor for Tashkent.
const ROAD_FACTOR = 1.3;

// Reasonable bound to reject junk coordinates outside the city / region.
const MAX_TASHKENT_DISTANCE_KM = 60;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

export function routeDistanceKm(dest: { lat: number; lng: number }): number {
  return haversineKm(WAREHOUSE, dest) * ROAD_FACTOR;
}

export function calculateCourierPriceTiyin(
  distanceKm: number,
  subtotalTiyin: number,
  tariff: DeliveryTariff = DEFAULT_TARIFF,
): number {
  if (subtotalTiyin >= tariff.freeThresholdTiyin) return 0;
  const km = Math.max(0, distanceKm);
  const raw = tariff.baseTiyin + Math.ceil(km) * tariff.perKmTiyin;
  // round to nearest 1 000 сум
  const rounded = Math.round(raw / 1_000_00) * 1_000_00;
  return Math.max(tariff.baseTiyin, rounded);
}

export function isWithinDeliveryZone(dest: { lat: number; lng: number }): boolean {
  return haversineKm(WAREHOUSE, dest) <= MAX_TASHKENT_DISTANCE_KM;
}
