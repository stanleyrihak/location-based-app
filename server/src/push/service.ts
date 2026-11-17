import type { DatabaseSync } from 'node:sqlite';

import { messageFor } from './messages.ts';
import type { Push } from './types.ts';

export type Outgoing = { token: string; title: string; body: string; sound: boolean };

/** Delivers notifications to phones. Expo's service in real life, a list in tests. */
export type Sender = (messages: Outgoing[]) => Promise<void>;

/**
 * Turns an order event into notifications: picks the message (messages.ts), finds the phones
 * of the people it's for (the customer, or every seller of the café), and hands them to the
 * sender. Sending happens in the background: `orderChanged` returns at once, and a failure is
 * only logged, because the order change it reports already happened.
 */
export function createPushService(db: DatabaseSync, sender: Sender) {
  const pending = new Set<Promise<void>>();

  const push: Push = {
    orderChanged(order, event) {
      const message = messageFor(order, event);
      if (!message) return;

      const rows = (
        message.to === 'customer'
          ? db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(order.user_id)
          : db
              .prepare(
                `SELECT push_tokens.token FROM push_tokens
                 JOIN staff ON staff.id = push_tokens.staff_id WHERE staff.cafe_id = ?`,
              )
              .all(order.cafe_id)
      ) as { token: string }[];
      if (rows.length === 0) return;

      const sending = sender(
        rows.map(({ token }) => ({
          token,
          title: message.title,
          body: message.body,
          sound: message.sound,
        })),
      )
        .catch((error: unknown) => {
          console.error(`Push for order #${order.number} failed`, error);
        })
        .finally(() => {
          pending.delete(sending);
        });
      pending.add(sending);
    },
  };

  return {
    ...push,
    /** Waits for every notification that is still being sent. For tests and shutdown. */
    async settled() {
      await Promise.all(pending);
    },
  };
}
