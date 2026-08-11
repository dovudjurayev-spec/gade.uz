export const TIYIN_PER_SUM = 100;

export function tiyinToSum(tiyin: number): number {
  return Math.round(tiyin / TIYIN_PER_SUM);
}

export function sumToTiyin(sum: number): number {
  return Math.round(sum * TIYIN_PER_SUM);
}

const formatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatPrice(tiyin: number): string {
  return `${formatter.format(tiyinToSum(tiyin))} сум`;
}
