export function selectBarSize(rangeSeconds: number): string {
  if (rangeSeconds < 2 * 3600) return '1m';
  if (rangeSeconds < 12 * 3600) return '5m';
  if (rangeSeconds < 2 * 86400) return '15m';
  if (rangeSeconds < 7 * 86400) return '1H';
  if (rangeSeconds < 30 * 86400) return '4H';
  return '1D';
}
