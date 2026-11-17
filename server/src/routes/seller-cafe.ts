import { Hono } from 'hono';

import { requireSeller } from '../auth/sessions.ts';
import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { originOf, readJson } from '../request.ts';
import { asBoolean, asCoordinates, asInteger, asString } from '../validate.ts';
import { type CafeRow, type MenuItemRow, toCafe, toMenuItem } from '../views.ts';

/** The seller's own café and menu: pause orders, sell from here, sold out, prices. */
export function sellerCafeRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono();

  /**
   * The Stand tab. `isPaused` ("Pause orders"): the café stays visible, but new orders get 409
   * cafe_paused. `coordinates` ("Sell from here"): the selling point, which the delivery range
   * is measured from. It can't move while an order is unfinished: the customer chose the café
   * by its distance, and the seller is walking from it.
   */
  app.patch('/seller/cafe', async (c) => {
    const { cafeId } = requireSeller(c, deps);
    const body = await readJson(c);
    // Check every field first, then write them all, so a bad field changes nothing.
    const isPaused = body.isPaused === undefined ? undefined : asBoolean(body.isPaused, 'isPaused');
    const coordinates =
      body.coordinates === undefined ? undefined : asCoordinates(body.coordinates, 'coordinates');

    if (coordinates) {
      const busy = db
        .prepare(
          `SELECT 1 FROM orders
           WHERE cafe_id = ? AND status IN ('received', 'preparing', 'on-the-way') LIMIT 1`,
        )
        .get(cafeId);
      if (busy) {
        throw new HttpError(409, 'cafe_busy', 'Finish your open orders before moving the stand.');
      }
      db.prepare('UPDATE cafes SET latitude = ?, longitude = ? WHERE id = ?').run(
        coordinates.latitude,
        coordinates.longitude,
        cafeId,
      );
    }
    if (isPaused !== undefined) {
      db.prepare('UPDATE cafes SET is_paused = ? WHERE id = ?').run(isPaused ? 1 : 0, cafeId);
    }
    const cafe = db.prepare('SELECT * FROM cafes WHERE id = ?').get(cafeId) as CafeRow;
    return c.json(toCafe(cafe, originOf(c)));
  });

  /** The Menu tab: every item of the café in menu order, sold-out ones too. */
  app.get('/seller/menu', (c) => {
    const { cafeId } = requireSeller(c, deps);
    const rows = db
      .prepare('SELECT * FROM menu_items WHERE cafe_id = ? ORDER BY position')
      .all(cafeId) as MenuItemRow[];
    return c.json(rows.map((row) => toMenuItem(row, originOf(c))));
  });

  /** Sold out or back in stock, a new price, a new description. Own café's items only. */
  app.patch('/seller/menu-items/:id', async (c) => {
    const { cafeId } = requireSeller(c, deps);
    const id = c.req.param('id');
    const item = db
      .prepare('SELECT * FROM menu_items WHERE id = ? AND cafe_id = ?')
      .get(id, cafeId) as MenuItemRow | undefined;
    if (!item) {
      throw new HttpError(404, 'item_not_found', 'There is no such item on your menu.');
    }

    const body = await readJson(c);
    // Check every field first, then write them all, so a bad field changes nothing.
    const soldOut = body.soldOut === undefined ? undefined : asBoolean(body.soldOut, 'soldOut');
    const price =
      body.priceCents === undefined
        ? undefined
        : asInteger(body.priceCents, 'priceCents', 0, 100_000);
    const description =
      body.description === undefined
        ? undefined
        : asString(body.description, 'description', 200).trim();

    if (soldOut !== undefined) {
      db.prepare('UPDATE menu_items SET sold_out = ? WHERE id = ?').run(soldOut ? 1 : 0, id);
    }
    if (price !== undefined) {
      db.prepare('UPDATE menu_items SET price_cents = ? WHERE id = ?').run(price, id);
    }
    if (description !== undefined) {
      db.prepare('UPDATE menu_items SET description = ? WHERE id = ?').run(description, id);
    }
    const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id) as MenuItemRow;
    return c.json(toMenuItem(updated, originOf(c)));
  });

  return app;
}
