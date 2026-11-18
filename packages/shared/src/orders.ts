import type { Order, OrderStatus } from './types.ts';

/** How long a café has to accept a paid order before it cancels itself: 5 minutes. */
export const ACCEPT_WINDOW_MS = 5 * 60_000;

/**
 * Every allowed status change. Statuses only move forward; anything not listed is refused.
 * `pending-payment` (created, not paid yet) and `abandoned` (never paid) exist only on the
 * server, so they're plain strings here rather than OrderStatus values.
 */
const MOVES: Record<string, readonly string[]> = {
  'pending-payment': ['received', 'abandoned'],
  received: ['preparing', 'declined', 'expired', 'cancelled'],
  preparing: ['on-the-way'],
  'on-the-way': ['delivered'],
};

export function canMove(from: string, to: string): boolean {
  return MOVES[from]?.includes(to) ?? false;
}

/** Still happening: waiting for the café, being made, or on its way. */
export function isLiveStatus(status: OrderStatus): boolean {
  return status === 'received' || status === 'preparing' || status === 'on-the-way';
}

/** Finished, one way or another. */
export function isEndedStatus(status: OrderStatus): boolean {
  return !isLiveStatus(status);
}

/** Whole seconds the café has left to accept, never below 0; null when there's no deadline. */
export function secondsToAccept(order: Pick<Order, 'acceptBy'>, now: number): number | null {
  if (!order.acceptBy) return null;
  return Math.max(0, Math.floor((Date.parse(order.acceptBy) - now) / 1000));
}

/** 65 → "1:05" */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The seller's Orders tab, in sections. */
export type SellerQueue = {
  newOrders: Order[];
  preparing: Order[];
  onTheWay: Order[];
  recent: Order[];
};

const oldestFirst = (a: Order, b: Order) => Date.parse(a.createdAt) - Date.parse(b.createdAt);

/**
 * Sorts the café's orders into the sections of its Orders tab. Live sections are oldest first,
 * so the order waiting longest is on top; finished ones are newest first.
 */
export function groupSellerQueue(orders: Order[]): SellerQueue {
  const byStatus = (status: OrderStatus) =>
    orders.filter((order) => order.status === status).sort(oldestFirst);
  return {
    newOrders: byStatus('received'),
    preparing: byStatus('preparing'),
    onTheWay: byStatus('on-the-way'),
    recent: orders.filter((order) => isEndedStatus(order.status)).sort((a, b) => oldestFirst(b, a)),
  };
}

/** The order the seller is walking over right now (one per walk), or null. */
export function deliveringOrderId(orders: Order[] | undefined): string | null {
  return orders?.find((order) => order.status === 'on-the-way')?.id ?? null;
}

/**
 * What happened to the customer's money, for the order screen. While the café hasn't
 * accepted, the money is only reserved; it is taken when the café accepts, and released
 * when the order is declined, not accepted in time or cancelled.
 */
export function paymentLine(status: OrderStatus, paymentLabel: string): string {
  if (status === 'received') return `Reserved on ${paymentLabel}`;
  if (status === 'declined' || status === 'expired' || status === 'cancelled') return 'Not charged';
  return `Paid with ${paymentLabel}`;
}

/**
 * "Order again" on Home: the newest finished order from a café that can deliver now.
 * An order still on its way isn't offered; it's on the Orders tab. `orders` is newest first.
 */
export function orderToRepeat<T extends Pick<Order, 'cafeId' | 'status'>>(
  orders: T[],
  inRangeCafeIds: string[],
): T | undefined {
  return orders.find(
    (order) => !isLiveStatus(order.status) && inRangeCafeIds.includes(order.cafeId),
  );
}
