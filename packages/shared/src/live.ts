import type { Order } from './types.ts';

/**
 * Puts an order that arrived over the live connection into a cached list of orders.
 *
 * - A known order is replaced, unless the cached copy is newer: messages can arrive out of
 *   order, and an old "received" must not undo a newer "preparing".
 * - An unknown order (a new one) is added. The list stays newest first.
 * - No list yet (never loaded): stays undefined; the first fetch will include the order.
 */
export function applyOrderUpdate(
  orders: Order[] | undefined,
  incoming: Order,
): Order[] | undefined {
  if (!orders) return undefined;

  const existing = orders.find((order) => order.id === incoming.id);
  if (existing && Date.parse(existing.updatedAt) > Date.parse(incoming.updatedAt)) {
    return orders;
  }
  const others = orders.filter((order) => order.id !== incoming.id);
  return [...others, incoming].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * How long to wait before reconnecting after the connection dropped `attempt` times in a row:
 * 1 s, 2 s, 4 s … at most 30 s. Growing waits keep a phone from hammering a server that is down.
 */
export function reconnectDelayMs(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** attempt);
}
