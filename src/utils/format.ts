/** 50 → "€0.50". Prices are stored in cents. */
export function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

/** 45.3 → "45 m", 1250 → "1.3 km". */
export function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}
