import { randomUUID } from 'node:crypto';

import { requireUser } from '../auth.ts';
import { db } from '../db.ts';
import { distanceInMetres } from '../geo.ts';
import { HttpError, readJson, reply, route } from '../http.ts';
import {
  asArray,
  asCoordinates,
  asInteger,
  asObject,
  asString,
} from '../validate.ts';
import { type MenuItemRow, type OrderRow, toOrder } from '../views.ts';
import { getCafeRow } from './cafes.ts';

const FIRST_ORDER_NUMBER = 2041;

/**
 * A pretend card payment, like the app's old pay(). The real one would charge through Stripe
 * here, on the server, where the secret key is safe. Card 0002 is Stripe's test card that
 * always declines.
 */
async function charge(methodId: string) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (methodId === 'card-0002') {
    throw new HttpError(402, 'payment_declined', 'The bank declined this payment.');
  }
}

/** Turns "/uploads/x.jpg" or "http://host/uploads/x.jpg" into the stored path, or throws. */
function uploadPath(value: unknown, field: string) {
  const text = asString(value, field);
  const match = /\/uploads\/[0-9a-f-]{36}\.(jpg|png|svg)$/.exec(text);
  if (!match) {
    throw new HttpError(400, 'invalid_field', `"${field}" must be a photo from POST /uploads.`, {
      field,
    });
  }
  return match[0];
}

/**
 * 2.8 "Confirm payment": checks everything, charges, and stores the order.
 *
 * The app sends only ids and quantities. Names and prices come from the database, so a
 * changed app can't order a cappuccino for 1 cent.
 */
route('POST', '/orders', async (ctx) => {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);

  const cafe = getCafeRow(asString(body.cafeId, 'cafeId', 100));
  const here = asCoordinates(body.coordinates, 'coordinates');
  const note = asString(body.note ?? '', 'note', 300).trim();
  const payment = asObject(body.payment, 'payment');
  const paymentMethodId = asString(payment.methodId, 'payment.methodId', 50);
  const paymentLabel = asString(payment.label, 'payment.label', 50);

  if (cafe.is_open !== 1) {
    throw new HttpError(409, 'cafe_closed', `${cafe.name} isn’t taking orders right now.`);
  }

  // E1: the server decides about range, with the position the phone sent when paying.
  if (cafe.latitude === null || cafe.longitude === null) {
    throw new HttpError(409, 'cafe_not_placed', 'Load the café list first (GET /cafes).');
  }
  const distanceM = Math.round(
    distanceInMetres(here, { latitude: cafe.latitude, longitude: cafe.longitude }),
  );
  if (distanceM > cafe.radius_m) {
    throw new HttpError(422, 'out_of_range', `${cafe.name} delivers within ${cafe.radius_m} m.`, {
      distanceM,
      radiusM: cafe.radius_m,
    });
  }

  // The lines: every item must be on this café's menu and not sold out (E6).
  const requested = asArray(body.lines, 'lines').map((value, index) => {
    const line = asObject(value, `lines[${index}]`);
    return {
      itemId: asString(line.itemId, `lines[${index}].itemId`, 100),
      quantity: asInteger(line.quantity, `lines[${index}].quantity`, 1, 20),
    };
  });
  const findItem = db.prepare('SELECT * FROM menu_items WHERE id = ? AND cafe_id = ?');
  const soldOut: string[] = [];
  const lines = requested.map(({ itemId, quantity }) => {
    const item = findItem.get(itemId, cafe.id) as MenuItemRow | undefined;
    if (!item || item.sold_out === 1) {
      soldOut.push(itemId);
      return null;
    }
    return {
      itemId,
      name: item.name,
      priceCents: item.price_cents,
      quantity,
      ...(item.image ? { image: item.image } : {}),
      section: item.section,
    };
  });
  if (soldOut.length > 0) {
    throw new HttpError(409, 'sold_out', 'Some items aren’t available any more.', {
      itemIds: soldOut,
    });
  }

  // Where to deliver: a scanned spot code, or the two photos and the position.
  const deliveryInput = asObject(body.delivery, 'delivery');
  let delivery;
  if (deliveryInput.kind === 'spot') {
    const spot = db
      .prepare('SELECT label FROM spots WHERE cafe_id = ? AND code = ?')
      .get(cafe.id, asString(deliveryInput.spotCode, 'delivery.spotCode', 200)) as
      | { label: string }
      | undefined;
    if (!spot) {
      throw new HttpError(422, 'not_a_spot', 'This code isn’t a spot of this café.');
    }
    delivery = { kind: 'spot', spotLabel: spot.label };
  } else if (deliveryInput.kind === 'photos') {
    delivery = {
      kind: 'photos',
      selfie: uploadPath(deliveryInput.selfie, 'delivery.selfie'),
      spot: uploadPath(deliveryInput.spot, 'delivery.spot'),
      coordinates: here,
    };
  } else {
    throw new HttpError(400, 'invalid_field', '"delivery.kind" must be "spot" or "photos".', {
      field: 'delivery.kind',
    });
  }

  const subtotalCents = lines.reduce(
    (sum, line) => sum + (line ? line.priceCents * line.quantity : 0),
    0,
  );
  const totalCents = subtotalCents + cafe.delivery_fee_cents;

  // Charge last, after every check: a declined card or a wrong field never costs anything.
  await charge(paymentMethodId);

  const now = new Date();
  const { last } = db.prepare('SELECT MAX(number) AS last FROM orders').get() as {
    last: number | null;
  };
  const id = randomUUID();
  db.prepare(
    `INSERT INTO orders (id, number, user_id, cafe_id, cafe_name, cafe_image, lines, note,
       subtotal_cents, delivery_fee_cents, total_cents, delivery, payment_label, status,
       created_at, ready_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?)`,
  ).run(
    id,
    last === null ? FIRST_ORDER_NUMBER : last + 1,
    user.id,
    cafe.id,
    cafe.name,
    cafe.image,
    JSON.stringify(lines),
    note,
    subtotalCents,
    cafe.delivery_fee_cents,
    totalCents,
    JSON.stringify(delivery),
    paymentLabel,
    now.toISOString(),
    new Date(now.getTime() + cafe.ready_in_min * 60_000).toISOString(),
    now.toISOString(),
  );

  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow;
  return reply(201, toOrder(row, ctx.origin));
});

/** 2.10: the user's own orders, newest first. */
route('GET', '/orders', (ctx) => {
  const user = requireUser(ctx);
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id) as OrderRow[];
  return rows.map((row) => toOrder(row, ctx.origin));
});

route('GET', '/orders/:id', (ctx) => {
  const user = requireUser(ctx);
  const row = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(ctx.params.id, user.id) as OrderRow | undefined;
  // 404, not 403, for someone else's order: don't even confirm that it exists.
  if (!row) {
    throw new HttpError(404, 'order_not_found', 'There is no such order.');
  }
  return toOrder(row, ctx.origin);
});
