// Delivery pricing: 20 000 base + 3 000/km, free for courier above 500 000.
// Server enforces the price — client-side quote is advisory only.

export const WAREHOUSE = {
  lat: 41.29249,
  lng: 69.28703,
  address: "Мирабадский пр. 64В, Ташкент",
};

export const DELIVERY_BASE_TIYIN = 20_000_00;
export const DELIVERY_PER_KM_TIYIN = 3_000_00;
export const FREE_DELIVERY_THRESHOLD_TIYIN = 500_000_00;

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

export function calculateCourierPriceTiyin(distanceKm: number, subtotalTiyin: number): number {
  if (subtotalTiyin >= FREE_DELIVERY_THRESHOLD_TIYIN) return 0;
  const km = Math.max(0, distanceKm);
  const raw = DELIVERY_BASE_TIYIN + Math.ceil(km) * DELIVERY_PER_KM_TIYIN;
  // round to nearest 1 000 сум
  const rounded = Math.round(raw / 1_000_00) * 1_000_00;
  return Math.max(DELIVERY_BASE_TIYIN, rounded);
}

export function isWithinDeliveryZone(dest: { lat: number; lng: number }): boolean {
  return haversineKm(WAREHOUSE, dest) <= MAX_TASHKENT_DISTANCE_KM;
}
