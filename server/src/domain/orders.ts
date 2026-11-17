import { randomUUID } from 'node:crypto';

import { ACCEPT_WINDOW_MS, canMove, type DeclineReason } from '@shoot/shared';

import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { type Coordinates, distanceInMetres } from '../geo.ts';
import { getCafeRow } from '../routes/cafes.ts';
import type { MenuItemRow, OrderRow } from '../views.ts';
import type { OrderEvent } from './events.ts';
import { deletePhotos } from './photos.ts';

// Every rule about an order's life lives here: what it takes to place one, who may move it to
// which status, and what happens to the money and the photos on the way. The routes only
// check who is asking and call these functions.

const FIRST_ORDER_NUMBER = 2041;
const UNPAID_LIFETIME_MS = 30 * 60_000;

/** A new order as the app sends it, already checked for types by the route. */
export type NewOrderInput = {
  cafeId: string;
  lines: { itemId: string; quantity: number }[];
  note: string;
  coordinates: Coordinates;
  delivery: { kind: 'spot'; spotCode: string } | { kind: 'photos'; selfie: string; spot: string };
  payment: { methodId: string; label: string };
};

/** Tells the live connections and push about a change. Exactly once per status change. */
function emit(deps: Deps, order: OrderRow, event: OrderEvent) {
  deps.hub.orderChanged(order);
  deps.push.orderChanged(order, event);
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}

function getRow(deps: Deps, id: string) {
  return deps.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
}

/**
 * The customer's own order, or 404. Someone else's order also gives 404, not 403: the answer
 * shouldn't even confirm that it exists.
 */
function getUserOrder(deps: Deps, userId: string, orderId: string): OrderRow {
  const row = getRow(deps, orderId);
  if (!row || row.user_id !== userId) {
    throw new HttpError(404, 'order_not_found', 'There is no such order.');
  }
  return row;
}

/** An order of this café, or 404. */
function getCafeOrder(deps: Deps, cafeId: string, orderId: string): OrderRow {
  const row = getRow(deps, orderId);
  if (!row || row.cafe_id !== cafeId || row.status === 'pending-payment') {
    throw new HttpError(404, 'order_not_found', 'There is no such order.');
  }
  return row;
}

const ENDED = new Set(['delivered', 'declined', 'expired', 'cancelled', 'abandoned']);

// Orders being accepted right now. Taking the money is a network call that takes a moment, and
// while it runs the order is still `received`. Without this, a second accept could capture
// again, or a cancel, a decline or the timer could end the order and release the money while
// the capture goes through: the customer would be charged for an order that says "cancelled".
// `move` refuses every other change of an order in this Set. One server process, so a Set is enough.
const accepting = new Set<string>();

/**
 * Moves an order to `to`, setting `fields` in the same write.
 *
 * `WHERE status = ?` makes the change conditional: if something else moved the order since
 * we read it, nothing is updated and the caller gets 409 instead of overwriting that change.
 */
async function move(
  deps: Deps,
  order: OrderRow,
  to: string,
  event: OrderEvent,
  fields: Record<string, string | null> = {},
): Promise<OrderRow> {
  if (!canMove(order.status, to)) {
    throw new HttpError(409, 'status_conflict', `The order is already "${order.status}".`, {
      status: order.status,
    });
  }
  if (accepting.has(order.id) && to !== 'preparing') {
    throw new HttpError(409, 'status_conflict', 'The café is accepting this order right now.', {
      status: 'preparing',
    });
  }
  const now = iso(deps.now());
  const all: Record<string, string | null> = {
    ...fields,
    status: to,
    updated_at: now,
    ...(ENDED.has(to) ? { ended_at: now, accept_by: null } : {}),
  };
  const columns = Object.keys(all);
  const { changes } = deps.db
    .prepare(
      `UPDATE orders SET ${columns.map((column) => `${column} = ?`).join(', ')}
       WHERE id = ? AND status = ?`,
    )
    .run(...Object.values(all), order.id, order.status);
  if (changes !== 1) {
    throw new HttpError(409, 'status_conflict', 'The order changed in the meantime.');
  }

  const updated = getRow(deps, order.id) as OrderRow;
  if (ENDED.has(to)) {
    await deletePhotos(deps, updated.delivery);
  }
  emit(deps, updated, event);
  return updated;
}

/**
 * Lets go of the reserved money. A failure is logged, not thrown: the order has ended either
 * way, and Stripe drops an uncaptured reservation by itself after a few days.
 */
async function release(deps: Deps, order: OrderRow) {
  try {
    await deps.payments.release(order.payment_id);
  } catch (error) {
    console.error(`Couldn't release payment for order #${order.number}`, error);
  }
}

/** Turns "/uploads/x.jpg" or "http://host/uploads/x.jpg" into the stored path, or throws. */
function uploadPath(value: string, field: string) {
  const match = /\/uploads\/[0-9a-f-]{36}\.(jpg|png|svg)$/.exec(value);
  if (!match) {
    throw new HttpError(400, 'invalid_field', `"${field}" must be a photo from POST /uploads.`, {
      field,
    });
  }
  return match[0];
}

/**
 * 2.8: checks everything, reserves the money, and stores the order as `pending-payment`.
 * The app then lets the customer pay (Stripe's sheet) and calls confirmPayment.
 *
 * The checks come first, in this order, so nothing is reserved for an order that can't work.
 * Names and prices come from the menu, never from the app.
 */
export async function createOrder(
  deps: Deps,
  userId: string,
  input: NewOrderInput,
): Promise<{ order: OrderRow; clientSecret: string | null }> {
  const { db } = deps;
  const cafe = getCafeRow(db, input.cafeId);

  if (cafe.is_open !== 1) {
    throw new HttpError(409, 'cafe_closed', `${cafe.name} isn’t open right now.`);
  }
  if (cafe.is_paused === 1) {
    throw new HttpError(409, 'cafe_paused', `${cafe.name} isn’t taking orders right now.`);
  }

  // E1: the server decides about range, with the position the phone sent when paying.
  if (cafe.latitude === null || cafe.longitude === null) {
    throw new HttpError(409, 'cafe_not_placed', 'Load the café list first (GET /cafes).');
  }
  const distanceM = Math.round(
    distanceInMetres(input.coordinates, { latitude: cafe.latitude, longitude: cafe.longitude }),
  );
  if (distanceM > cafe.radius_m) {
    throw new HttpError(422, 'out_of_range', `${cafe.name} delivers within ${cafe.radius_m} m.`, {
      distanceM,
      radiusM: cafe.radius_m,
    });
  }

  // E6: every item must be on this café's menu and not sold out.
  const findItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND cafe_id = ?');
  const soldOut: string[] = [];
  const lines = input.lines.flatMap(({ itemId, quantity }) => {
    const item = findItem.get(itemId, cafe.id) as MenuItemRow | undefined;
    if (!item || item.sold_out === 1) {
      soldOut.push(itemId);
      return [];
    }
    return [
      {
        itemId,
        name: item.name,
        priceCents: item.price_cents,
        quantity,
        ...(item.image ? { image: item.image } : {}),
        section: item.section,
      },
    ];
  });
  if (soldOut.length > 0) {
    throw new HttpError(409, 'sold_out', 'Some items aren’t available any more.', {
      itemIds: soldOut,
    });
  }

  let delivery;
  if (input.delivery.kind === 'spot') {
    const spot = db
      .prepare('SELECT label FROM spots WHERE cafe_id = ? AND code = ?')
      .get(cafe.id, input.delivery.spotCode) as { label: string } | undefined;
    if (!spot) {
      throw new HttpError(422, 'not_a_spot', 'This code isn’t a spot of this café.');
    }
    delivery = { kind: 'spot', spotLabel: spot.label };
  } else {
    delivery = {
      kind: 'photos',
      selfie: uploadPath(input.delivery.selfie, 'delivery.selfie'),
      spot: uploadPath(input.delivery.spot, 'delivery.spot'),
      coordinates: input.coordinates,
    };
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const totalCents = subtotalCents + cafe.delivery_fee_cents;

  // Every check passed: now reserve. This charges nothing yet.
  const { paymentId, clientSecret } = await deps.payments.reserve(
    totalCents,
    input.payment.methodId,
  );

  const now = iso(deps.now());
  const { last } = db.prepare('SELECT MAX(number) AS last FROM orders').get() as {
    last: number | null;
  };
  const id = randomUUID();
  db.prepare(
    `INSERT INTO orders (id, number, user_id, cafe_id, cafe_name, cafe_image, lines, note,
       subtotal_cents, delivery_fee_cents, total_cents, delivery, payment_id, payment_method_id,
       payment_label, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending-payment', ?, ?)`,
  ).run(
    id,
    last === null ? FIRST_ORDER_NUMBER : last + 1,
    userId,
    cafe.id,
    cafe.name,
    cafe.image,
    JSON.stringify(lines),
    input.note.trim(),
    subtotalCents,
    cafe.delivery_fee_cents,
    totalCents,
    JSON.stringify(delivery),
    paymentId,
    input.payment.methodId,
    input.payment.label,
    now,
    now,
  );

  const order = getRow(deps, id) as OrderRow;
  emit(deps, order, 'created');
  return { order, clientSecret };
}

/**
 * After the customer paid in the app: checks with the payment provider that the money is
 * really held, then hands the order to the café with its 5-minute accept window.
 */
export async function confirmPayment(deps: Deps, userId: string, orderId: string) {
  const order = getUserOrder(deps, userId, orderId);
  if (order.status === 'pending-payment' && !(await deps.payments.isReserved(order.payment_id))) {
    throw new HttpError(402, 'payment_declined', 'The bank declined this payment.');
  }
  return move(deps, order, 'received', 'received', {
    accept_by: iso(deps.now() + ACCEPT_WINDOW_MS),
  });
}

/** The café says yes: take the money, start the ready time. */
export async function acceptOrder(deps: Deps, cafeId: string, orderId: string) {
  const order = getCafeOrder(deps, cafeId, orderId);

  if (order.status === 'received' && order.accept_by && Date.parse(order.accept_by) < deps.now()) {
    // Too late, even if the timer hasn't run yet. End it now so the money is released.
    await expire(deps, order);
    throw new HttpError(409, 'expired', 'The 5 minutes to accept this order have passed.');
  }
  if (!canMove(order.status, 'preparing') || accepting.has(order.id)) {
    throw new HttpError(409, 'status_conflict', `The order is already "${order.status}".`, {
      status: order.status,
    });
  }

  accepting.add(order.id);
  try {
    try {
      await deps.payments.capture(order.payment_id);
    } catch (error) {
      console.error(`Couldn't capture payment for order #${order.number}`, error);
      throw new HttpError(
        402,
        'payment_failed',
        'The payment could not be taken. The order is still waiting.',
      );
    }
    const cafe = getCafeRow(deps.db, cafeId);
    const now = deps.now();
    return await move(deps, order, 'preparing', 'accepted', {
      accept_by: null,
      accepted_at: iso(now),
      ready_at: iso(now + cafe.ready_in_min * 60_000),
    });
  } finally {
    accepting.delete(order.id);
  }
}

/** The café says no, with a reason. The money is released. */
export async function declineOrder(
  deps: Deps,
  cafeId: string,
  orderId: string,
  reason: DeclineReason,
) {
  const order = getCafeOrder(deps, cafeId, orderId);
  const declined = await move(deps, order, 'declined', 'declined', { decline_reason: reason });
  await release(deps, order);
  return declined;
}

/** The customer changes their mind while the café hasn't answered yet. */
export async function cancelOrder(deps: Deps, userId: string, orderId: string) {
  const order = getUserOrder(deps, userId, orderId);
  const cancelled = await move(deps, order, 'cancelled', 'cancelled');
  await release(deps, order);
  return cancelled;
}

/** "On my way": the seller leaves with the order. */
export async function startDelivery(deps: Deps, cafeId: string, orderId: string) {
  return move(deps, getCafeOrder(deps, cafeId, orderId), 'on-the-way', 'on-the-way');
}

/** "Delivered": handed over. The photos are deleted by `move`. */
export async function markDelivered(deps: Deps, cafeId: string, orderId: string) {
  return move(deps, getCafeOrder(deps, cafeId, orderId), 'delivered', 'delivered');
}

async function expire(deps: Deps, order: OrderRow) {
  await move(deps, order, 'expired', 'expired');
  await release(deps, order);
}

/** The timer: ends every paid order the café didn't accept in time. Returns how many. */
export async function expireOverdue(deps: Deps): Promise<number> {
  const rows = deps.db
    .prepare("SELECT * FROM orders WHERE status = 'received' AND accept_by < ?")
    .all(iso(deps.now())) as OrderRow[];
  let expired = 0;
  for (const row of rows) {
    // An order the café is accepting right now (or that just changed) answers 409: skip it,
    // and keep going with the others.
    if (await skipConflict(() => expire(deps, row))) expired++;
  }
  return expired;
}

/** Runs a timer step; false when the order changed in the meantime (409), so it's skipped. */
async function skipConflict(step: () => Promise<unknown>): Promise<boolean> {
  try {
    await step();
    return true;
  } catch (error) {
    if (error instanceof HttpError && error.status === 409) return false;
    throw error;
  }
}

/** The timer: ends orders that were started but never paid. Returns how many. */
export async function abandonUnpaid(deps: Deps): Promise<number> {
  const rows = deps.db
    .prepare("SELECT * FROM orders WHERE status = 'pending-payment' AND created_at <= ?")
    .all(iso(deps.now() - UNPAID_LIFETIME_MS)) as OrderRow[];
  let abandoned = 0;
  for (const row of rows) {
    const ended = await skipConflict(async () => {
      await move(deps, row, 'abandoned', 'abandoned');
      await release(deps, row);
    });
    if (ended) abandoned++;
  }
  return abandoned;
}
