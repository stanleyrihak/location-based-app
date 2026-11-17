import type { OrderStatus } from './types.ts';

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
