import type { DeclineReason } from '@shoot/shared';
import { Hono } from 'hono';

import { requireSeller } from '../auth/sessions.ts';
import type { Deps } from '../deps.ts';
import { acceptOrder, declineOrder, markDelivered, startDelivery } from '../domain/orders.ts';
import { originOf, readJson } from '../request.ts';
import { asOneOf } from '../validate.ts';
import { type OrderRow, toOrder } from '../views.ts';

const DECLINE_REASONS: readonly DeclineReason[] = ['sold-out', 'too-busy', 'closing-soon', 'other'];
const RECENT_ENDED = 20;

/** The seller's side: the café's queue, and the buttons that move an order along. */
export function sellerOrderRoutes(deps: Deps) {
  const app = new Hono();

  /**
   * The Orders tab: live orders first, oldest first like a queue (the one waiting longest is
   * on top), then the last 20 finished ones. Only this seller's café.
   */
  app.get('/seller/orders', (c) => {
    const { cafeId } = requireSeller(c, deps);
    const live = deps.db
      .prepare(
        `SELECT * FROM orders WHERE cafe_id = ? AND status IN ('received', 'preparing', 'on-the-way')
         ORDER BY created_at`,
      )
      .all(cafeId) as OrderRow[];
    const ended = deps.db
      .prepare(
        `SELECT * FROM orders
         WHERE cafe_id = ? AND status IN ('delivered', 'declined', 'expired', 'cancelled')
         ORDER BY ended_at DESC LIMIT ?`,
      )
      .all(cafeId, RECENT_ENDED) as OrderRow[];
    return c.json([...live, ...ended].map((row) => toOrder(row, originOf(c))));
  });

  app.post('/seller/orders/:id/accept', async (c) => {
    const { cafeId } = requireSeller(c, deps);
    return c.json(toOrder(await acceptOrder(deps, cafeId, c.req.param('id')), originOf(c)));
  });

  app.post('/seller/orders/:id/decline', async (c) => {
    const { cafeId } = requireSeller(c, deps);
    const reason = asOneOf((await readJson(c)).reason, 'reason', DECLINE_REASONS);
    return c.json(
      toOrder(await declineOrder(deps, cafeId, c.req.param('id'), reason), originOf(c)),
    );
  });

  /** "On my way": the seller leaves with the order. */
  app.post('/seller/orders/:id/on-my-way', async (c) => {
    const { cafeId } = requireSeller(c, deps);
    return c.json(toOrder(await startDelivery(deps, cafeId, c.req.param('id')), originOf(c)));
  });

  app.post('/seller/orders/:id/delivered', async (c) => {
    const { cafeId } = requireSeller(c, deps);
    return c.json(toOrder(await markDelivered(deps, cafeId, c.req.param('id')), originOf(c)));
  });

  return app;
}
