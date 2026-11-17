import type { QueryClient } from '@tanstack/query-core';

import type { Order, PositionMessage, Track } from './types.ts';

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

/**
 * Writes an order from the live connection into the cached list under `key`, and returns the
 * cached copy from before (undefined for a new order).
 *
 * If a fetch of the list is running, its answer may be from before this order and would
 * overwrite it (a new order would vanish). So the fetch starts again: the old answer is
 * dropped, and the new one includes the order.
 */
export function writeLiveOrder(
  client: QueryClient,
  key: readonly unknown[],
  order: Order,
): Order | undefined {
  const previous = client.getQueryData<Order[]>(key)?.find((cached) => cached.id === order.id);
  client.setQueryData<Order[]>(key, (orders) => applyOrderUpdate(orders, order));
  if (client.isFetching({ queryKey: key }) > 0) {
    void client.refetchQueries({ queryKey: key }).catch(() => {});
  }
  return previous;
}

/**
 * Puts a position from the live connection into an order's track. An older position than the
 * one already there is ignored, like an out-of-order order update.
 */
export function applyPosition(track: Track | undefined, message: PositionMessage): Track {
  const current = track ?? { seller: null, customer: null };
  const side = message.type === 'seller.position' ? 'seller' : 'customer';
  const known = current[side];
  if (known && Date.parse(known.at) > Date.parse(message.position.at)) return current;
  return { ...current, [side]: message.position };
}
