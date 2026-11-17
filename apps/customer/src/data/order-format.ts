import type { DeclineReason, Order, OrderStatus } from '@shoot/shared';

import { formatClockTime, formatItemCount } from '@/utils/format';

/** The four steps of an order, in order. Step numbers and the progress bar come from here. */
export const ORDER_STEPS: OrderStatus[] = ['received', 'preparing', 'on-the-way', 'delivered'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Waiting for the café',
  preparing: 'Preparing',
  'on-the-way': 'On the way',
  delivered: 'Delivered',
  declined: 'Declined',
  expired: 'Not accepted',
  cancelled: 'Cancelled',
};

/** 1 for received … 4 for delivered (0 for an order that ended early). */
export function stepOf(status: OrderStatus) {
  return ORDER_STEPS.indexOf(status) + 1;
}

/** "3 items" from the quantities, not the number of lines. */
export function orderItemCount(order: Order) {
  return formatItemCount(order.lines.reduce((sum, line) => sum + line.quantity, 0));
}

/** "Cappuccino, 2 × Croissant": what was in it, for "Order again". */
export function orderContents(order: Order) {
  return order.lines
    .map((line) => (line.quantity > 1 ? `${line.quantity} × ${line.name}` : line.name))
    .join(', ');
}

/** "9:51", or null until the café accepts: the ready time only starts then. */
export function readyTime(order: Order) {
  return order.readyAt ? formatClockTime(new Date(order.readyAt)) : null;
}

/**
 * Whole minutes until ready, never below 0, or null until the café accepts.
 * `now` is passed in, so rendering stays pure.
 */
export function minutesLeft(order: Order, now: number) {
  return order.readyAt ? Math.max(0, Math.round((Date.parse(order.readyAt) - now) / 60_000)) : null;
}

/** "5 Nov" */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Why the café said no, in the customer's words. */
export function declineText(reason: DeclineReason | null, cafeName: string) {
  switch (reason) {
    case 'sold-out':
      return `${cafeName} ran out of something in your order.`;
    case 'too-busy':
      return `${cafeName} is too busy right now.`;
    case 'closing-soon':
      return `${cafeName} is closing soon.`;
    default:
      return `${cafeName} couldn’t take your order.`;
  }
}
