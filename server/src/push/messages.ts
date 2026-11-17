import type { DeclineReason } from '@shoot/shared';

import type { OrderEvent } from '../domain/events.ts';
import type { OrderRow } from '../views.ts';

export type PushMessage = {
  to: 'customer' | 'seller';
  title: string;
  body: string;
  /** Plays the phone's notification sound. Only for the seller's new orders. */
  sound: boolean;
};

const NOT_CHARGED = 'You haven’t been charged.';

const DECLINE_TEXT: Record<DeclineReason, string> = {
  'sold-out': 'Something you ordered sold out.',
  'too-busy': 'The café is too busy right now.',
  'closing-soon': 'The café is closing soon.',
  other: 'The café can’t make it right now.',
};

function itemCount(order: OrderRow) {
  const count = (JSON.parse(order.lines) as { quantity: number }[]).reduce(
    (sum, line) => sum + line.quantity,
    0,
  );
  return count === 1 ? '1 item' : `${count} items`;
}

/** The notification for an order event, and who gets it. Null when nobody needs to know. */
export function messageFor(order: OrderRow, event: OrderEvent): PushMessage | null {
  const cafe = order.cafe_name;
  switch (event) {
    case 'received':
      return {
        to: 'seller',
        title: `New order #${order.number}`,
        body: `${itemCount(order)} · accept within 5 minutes`,
        sound: true,
      };
    case 'accepted':
      return {
        to: 'customer',
        title: `${cafe} accepted your order`,
        body: 'They’re making it now.',
        sound: false,
      };
    case 'on-the-way':
      return {
        to: 'customer',
        title: 'Your order is on its way',
        body: `From ${cafe}.`,
        sound: false,
      };
    case 'delivered':
      return {
        to: 'customer',
        title: 'Delivered. Enjoy!',
        body: `Thanks for ordering from ${cafe}.`,
        sound: false,
      };
    case 'declined':
      return {
        to: 'customer',
        title: `${cafe} couldn’t take your order`,
        body: `${DECLINE_TEXT[(order.decline_reason ?? 'other') as DeclineReason]} ${NOT_CHARGED}`,
        sound: false,
      };
    case 'expired':
      return {
        to: 'customer',
        title: 'Your order wasn’t accepted',
        body: `${cafe} didn’t answer in time. ${NOT_CHARGED}`,
        sound: false,
      };
    default:
      // created, cancelled (the customer did it themselves), abandoned (never paid).
      return null;
  }
}
