import type { PositionMessage } from '@shoot/shared';

import { type OrderRow, toOrder } from '../views.ts';

/** Who a connection belongs to: a customer, or a seller of one café. */
export type Listener = { userId: string } | { cafeId: string };

type Connection = {
  send(text: string): void;
  who: Listener;
  /** The address the phone used, for the image URLs in the order. */
  origin: string;
};

/** Sends order changes to the apps that are connected right now (WebSocket). */
export interface Hub {
  orderChanged(order: OrderRow): void;
  /** Adds a connection. Returns the function that removes it again. */
  attach(socket: { send(text: string): void }, who: Listener, origin: string): () => void;
  /**
   * Sends `{ type: 'ping' }` to every connection. main.ts calls it every 20 s: a phone that hears
   * nothing for 45 s knows the connection is dead and reconnects.
   */
  ping(): void;
  /** `seller.position` goes only to the order's customer, `customer.position` only to its café. */
  positionChanged(order: OrderRow, message: PositionMessage): void;
}

/**
 * The open connections, in memory. When an order changes, its customer and every seller of
 * its café get `{ type: 'order.updated', order }`, the same order JSON as GET /orders/:id.
 * Nobody else does: that's what keeps one customer from seeing another's orders.
 *
 * Unpaid orders (`pending-payment`, `abandoned`) are never sent: for the café they don't exist.
 */
export function createHub(): Hub {
  const connections = new Set<Connection>();

  return {
    attach(socket, who, origin) {
      const connection: Connection = { send: (text) => socket.send(text), who, origin };
      connections.add(connection);
      return () => {
        connections.delete(connection);
      };
    },

    ping() {
      for (const connection of connections) {
        try {
          connection.send('{"type":"ping"}');
        } catch {
          // A connection that just dropped; its close handler removes it.
        }
      }
    },

    positionChanged(order, message) {
      const text = JSON.stringify(message);
      for (const connection of connections) {
        const { who } = connection;
        const forIt =
          message.type === 'seller.position'
            ? 'userId' in who && who.userId === order.user_id
            : 'cafeId' in who && who.cafeId === order.cafe_id;
        if (!forIt) continue;
        try {
          connection.send(text);
        } catch {
          // A connection that just dropped; its close handler removes it.
        }
      }
    },

    orderChanged(order) {
      if (order.status === 'pending-payment' || order.status === 'abandoned') return;

      for (const connection of connections) {
        const { who } = connection;
        const isOwner = 'userId' in who && who.userId === order.user_id;
        const isCafe = 'cafeId' in who && who.cafeId === order.cafe_id;
        if (!isOwner && !isCafe) continue;
        try {
          connection.send(
            JSON.stringify({ type: 'order.updated', order: toOrder(order, connection.origin) }),
          );
        } catch {
          // A connection that just dropped; its close handler removes it.
        }
      }
    },
  };
}
