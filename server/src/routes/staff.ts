import { requireStaff } from '../auth.ts';
import { db } from '../db.ts';
import { HttpError, readJson, route } from '../http.ts';
import { isOrderStatus, stepOf } from '../status.ts';
import { asInteger, asString } from '../validate.ts';
import {
  type CafeRow,
  type MenuItemRow,
  type OrderRow,
  toCafe,
  toMenuItem,
  toOrder,
} from '../views.ts';
import { getCafeRow } from './cafes.ts';

// What the café dashboard and the courier will use. Every route needs the X-Staff-Key header.

/** A café's orders, oldest first, like a queue. ?active=true leaves out delivered ones. */
route('GET', '/staff/cafes/:id/orders', (ctx) => {
  requireStaff(ctx);
  getCafeRow(ctx.params.id);
  const activeOnly = ctx.url.searchParams.get('active') === 'true';
  const rows = db
    .prepare(
      `SELECT * FROM orders WHERE cafe_id = ? ${activeOnly ? "AND status != 'delivered'" : ''}
       ORDER BY created_at`,
    )
    .all(ctx.params.id) as OrderRow[];
  return rows.map((row) => toOrder(row, ctx.origin));
});

/** Moves an order to the next step. Only forward: a delivered order can't become "preparing". */
route('PATCH', '/staff/orders/:id', async (ctx) => {
  requireStaff(ctx);
  const body = await readJson(ctx.req);
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(ctx.params.id) as
    | OrderRow
    | undefined;
  if (!row) {
    throw new HttpError(404, 'order_not_found', 'There is no such order.');
  }
  const status = body.status;
  if (!isOrderStatus(status)) {
    throw new HttpError(400, 'invalid_field', '"status" must be one of the order steps.', {
      field: 'status',
    });
  }
  if (!isOrderStatus(row.status) || stepOf(status) <= stepOf(row.status)) {
    throw new HttpError(409, 'status_backwards', `The order is already "${row.status}".`);
  }

  // auto_status = 0: a person is in charge of this order now, so the clock stops moving it.
  db.prepare(
    'UPDATE orders SET status = ?, auto_status = 0, updated_at = ? WHERE id = ?',
  ).run(status, new Date().toISOString(), row.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(row.id) as OrderRow;
  return toOrder(updated, ctx.origin);
});

/** Open or closed, and how long orders take. */
route('PATCH', '/staff/cafes/:id', async (ctx) => {
  requireStaff(ctx);
  const cafe = getCafeRow(ctx.params.id);
  const body = await readJson(ctx.req);

  if (body.isOpen !== undefined) {
    if (typeof body.isOpen !== 'boolean') {
      throw new HttpError(400, 'invalid_field', '"isOpen" must be true or false.');
    }
    db.prepare('UPDATE cafes SET is_open = ? WHERE id = ?').run(body.isOpen ? 1 : 0, cafe.id);
  }
  if (body.readyInMin !== undefined) {
    const minutes = asInteger(body.readyInMin, 'readyInMin', 1, 120);
    db.prepare('UPDATE cafes SET ready_in_min = ? WHERE id = ?').run(minutes, cafe.id);
  }
  if (body.openUntil !== undefined) {
    const time = asString(body.openUntil, 'openUntil', 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new HttpError(400, 'invalid_field', '"openUntil" must look like "18:00".');
    }
    db.prepare('UPDATE cafes SET open_until = ? WHERE id = ?').run(time, cafe.id);
  }
  return toCafe(db.prepare('SELECT * FROM cafes WHERE id = ?').get(cafe.id) as CafeRow, ctx.origin);
});

/** Sold out, back in stock, or a new price. */
route('PATCH', '/staff/menu-items/:id', async (ctx) => {
  requireStaff(ctx);
  const body = await readJson(ctx.req);
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(ctx.params.id) as
    | MenuItemRow
    | undefined;
  if (!item) {
    throw new HttpError(404, 'item_not_found', 'There is no such menu item.');
  }

  if (body.soldOut !== undefined) {
    if (typeof body.soldOut !== 'boolean') {
      throw new HttpError(400, 'invalid_field', '"soldOut" must be true or false.');
    }
    db.prepare('UPDATE menu_items SET sold_out = ? WHERE id = ?').run(
      body.soldOut ? 1 : 0,
      item.id,
    );
  }
  if (body.priceCents !== undefined) {
    const price = asInteger(body.priceCents, 'priceCents', 0, 100_000);
    db.prepare('UPDATE menu_items SET price_cents = ? WHERE id = ?').run(price, item.id);
  }
  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(item.id) as MenuItemRow;
  return toMenuItem(updated, ctx.origin);
});
