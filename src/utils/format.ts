/** 50 → "€0.50". Prices are stored in cents. */
export function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

/** A time of day as "9:51", like the clock on the phone. Used for "Ready in ~10 min (9:51)". */
export function formatClockTime(date: Date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 1 → "1 item", 3 → "3 items". */
export function formatItemCount(count: number) {
  return count === 1 ? '1 item' : `${count} items`;
}

/** 45.3 → "45 m", 1250 → "1.3 km". */
export function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}
