import type { Order } from '@shoot/shared';

/** 420 → "€4.20" */
export function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

/** "3 items", counting quantities, not lines. */
export function itemCount(order: Order) {
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return count === 1 ? '1 item' : `${count} items`;
}

/** "12 min ago", or "just now" in the first minute. */
export function ago(iso: string, now: number) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  return minutes < 1 ? 'just now' : `${minutes} min ago`;
}
