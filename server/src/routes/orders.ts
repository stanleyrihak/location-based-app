import { Hono } from 'hono';

import { requireUser } from '../auth/sessions.ts';
import type { Deps } from '../deps.ts';
import {
  cancelOrder,
  confirmPayment,
  createOrder,
  type NewOrderInput,
} from '../domain/orders.ts';
import { HttpError } from '../errors.ts';
import { originOf, readJson } from '../request.ts';
import { asArray, asCoordinates, asInteger, asObject, asString } from '../validate.ts';
import { type OrderRow, toOrder } from '../views.ts';

/**
 * Checks the shape of a new order from the app: right types, sane sizes. Whether the items,
 * café and spot make sense is the domain's job (createOrder).
 */
function parseNewOrder(body: Record<string, unknown>): NewOrderInput {
  const lines = asArray(body.lines, 'lines').map((value, index) => {
    const line = asObject(value, `lines[${index}]`);
    return {
      itemId: asString(line.itemId, `lines[${index}].itemId`, 100),
      quantity: asInteger(line.quantity, `lines[${index}].quantity`, 1, 20),
    };
  });
  const delivery = asObject(body.delivery, 'delivery');
  const payment = asObject(body.payment, 'payment');

  let parsedDelivery: NewOrderInput['delivery'];
  if (delivery.kind === 'spot') {
    parsedDelivery = { kind: 'spot', spotCode: asString(delivery.spotCode, 'delivery.spotCode', 200) };
  } else if (delivery.kind === 'photos') {
    parsedDelivery = {
      kind: 'photos',
      selfie: asString(delivery.selfie, 'delivery.selfie'),
      spot: asString(delivery.spot, 'delivery.spot'),
    };
  } else {
    throw new HttpError(400, 'invalid_field', '"delivery.kind" must be "spot" or "photos".', {
      field: 'delivery.kind',
    });
  }

  return {
    cafeId: asString(body.cafeId, 'cafeId', 100),
    lines,
    note: asString(body.note ?? '', 'note', 300),
    coordinates: asCoordinates(body.coordinates, 'coordinates'),
    delivery: parsedDelivery,
    payment: {
      methodId: asString(payment.methodId, 'payment.methodId', 50),
      label: asString(payment.label, 'payment.label', 50),
    },
  };
}

/** The customer's side of an order: place it, pay, cancel, follow it. */
export function orderRoutes(deps: Deps) {
  const app = new Hono();

  /**
   * 2.8 step one: checks the order and reserves the money. `payment.clientSecret` is for the
   * app's Stripe payment sheet; with fake payments it's null and the app confirms right away.
   */
  app.post('/orders', async (c) => {
    const user = requireUser(c, deps);
    const input = parseNewOrder(await readJson(c));
    const { order, clientSecret } = await createOrder(deps, user.id, input);
    return c.json({ order: toOrder(order, originOf(c)), payment: { clientSecret } }, 201);
  });

  /** 2.8 step two, after the customer paid: the order goes to the café. */
  app.post('/orders/:id/confirm', async (c) => {
    const user = requireUser(c, deps);
    const order = await confirmPayment(deps, user.id, c.req.param('id'));
    return c.json(toOrder(order, originOf(c)));
  });

  /** Only while the café hasn't answered yet. The money is released. */
  app.post('/orders/:id/cancel', async (c) => {
    const user = requireUser(c, deps);
    const order = await cancelOrder(deps, user.id, c.req.param('id'));
    return c.json(toOrder(order, originOf(c)));
  });

  /** 2.10: your orders, newest first. Unpaid ones aren't orders yet, so they're left out. */
  app.get('/orders', (c) => {
    const user = requireUser(c, deps);
    const rows = deps.db
      .prepare(
        `SELECT * FROM orders WHERE user_id = ? AND status NOT IN ('pending-payment', 'abandoned')
         ORDER BY created_at DESC`,
      )
      .all(user.id) as OrderRow[];
    return c.json(rows.map((row) => toOrder(row, originOf(c))));
  });

  app.get('/orders/:id', (c) => {
    const user = requireUser(c, deps);
    const row = deps.db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .get(c.req.param('id'), user.id) as OrderRow | undefined;
    // 404, not 403, for someone else's order: don't even confirm that it exists.
    if (!row) {
      throw new HttpError(404, 'order_not_found', 'There is no such order.');
    }
    return c.json(toOrder(row, originOf(c)));
  });

  return app;
}
