import type { Order, OrderStatus } from '@/data/types';
import { formatClockTime, formatItemCount } from '@/utils/format';

/** The four steps of an order, in order. Step numbers and the progress bar come from here. */
export const ORDER_STEPS: OrderStatus[] = ['received', 'preparing', 'on-the-way', 'delivered'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  'on-the-way': 'On the way',
  delivered: 'Delivered',
};

/** 1 for received … 4 for delivered. */
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

/** "9:51" */
export function readyTime(order: Order) {
  return formatClockTime(new Date(order.readyAt));
}

/** Whole minutes until ready, never below 0. `now` is passed in, so rendering stays pure. */
export function minutesLeft(order: Order, now: number) {
  return Math.max(0, Math.round((Date.parse(order.readyAt) - now) / 60_000));
}

/** "5 Nov" */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
