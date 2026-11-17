import type { DatabaseSync } from 'node:sqlite';

import { Hono } from 'hono';

import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { type Coordinates, moveBy } from '../geo.ts';
import { originOf } from '../request.ts';
import { type CafeRow, type MenuItemRow, toCafe, toMenuItem } from '../views.ts';

/**
 * Test data only: the cafés have no real address yet. The first time someone asks for cafés,
 * they are placed around that position (each at its seeded offset) and saved. So the app
 * works wherever you test it, and walking away really changes the distance.
 * POST /dev/anchor moves them again.
 */
export function placeCafesAround(db: DatabaseSync, anchor: Coordinates) {
  const rows = db.prepare('SELECT id, north_m, east_m FROM cafes').all() as {
    id: string;
    north_m: number;
    east_m: number;
  }[];
  const update = db.prepare('UPDATE cafes SET latitude = ?, longitude = ? WHERE id = ?');
  for (const row of rows) {
    const { latitude, longitude } = moveBy(anchor, row.north_m, row.east_m);
    update.run(latitude, longitude, row.id);
  }
}

export function getCafeRow(db: DatabaseSync, id: string): CafeRow {
  const row = db.prepare('SELECT * FROM cafes WHERE id = ?').get(id) as CafeRow | undefined;
  if (!row) {
    throw new HttpError(404, 'cafe_not_found', 'There is no café with this id.');
  }
  return row;
}

/** Cafés, menus and spot codes. Public: browsing doesn't need an account. */
export function cafeRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono();

  /** Cafés near a position. The app works out distance and "in range" for the list. */
  app.get('/cafes', (c) => {
    const latitude = Number(c.req.query('latitude'));
    const longitude = Number(c.req.query('longitude'));
    if (c.req.query('latitude') === undefined || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new HttpError(400, 'invalid_field', 'Send ?latitude=…&longitude=…', {
        field: 'latitude',
      });
    }

    const unplaced = db.prepare('SELECT 1 FROM cafes WHERE latitude IS NULL LIMIT 1').get();
    if (unplaced) placeCafesAround(db, { latitude, longitude });

    // A real server would only return cafés within a few kilometres (a geo index does that).
    const rows = db.prepare('SELECT * FROM cafes ORDER BY name').all() as CafeRow[];
    return c.json(rows.map((row) => toCafe(row, originOf(c))));
  });

  app.get('/cafes/:id', (c) => c.json(toCafe(getCafeRow(db, c.req.param('id')), originOf(c))));

  app.get('/cafes/:id/menu', (c) => {
    const id = c.req.param('id');
    getCafeRow(db, id);
    const rows = db
      .prepare('SELECT * FROM menu_items WHERE cafe_id = ? ORDER BY position')
      .all(id) as MenuItemRow[];
    return c.json(rows.map((row) => toMenuItem(row, originOf(c))));
  });

  /** Products of several cafés at once, for search on Home: ?cafeIds=a,b,c */
  app.get('/menu-items', (c) => {
    const ids = (c.req.query('cafeIds') ?? '').split(',').filter(Boolean).slice(0, 50);
    if (ids.length === 0) return c.json([]);
    const placeholders = ids.map(() => '?').join(', ');
    const rows = db
      .prepare(
        `SELECT * FROM menu_items WHERE cafe_id IN (${placeholders}) ORDER BY cafe_id, position`,
      )
      .all(...ids) as MenuItemRow[];
    return c.json(rows.map((row) => toMenuItem(row, originOf(c))));
  });

  /** 2.6: which spot a scanned QR code belongs to. 404 means E5 "This code doesn't work here". */
  app.get('/cafes/:id/spot', (c) => {
    const spot = db
      .prepare('SELECT id, cafe_id AS cafeId, label, code FROM spots WHERE cafe_id = ? AND code = ?')
      .get(c.req.param('id'), c.req.query('code') ?? '');
    if (!spot) {
      throw new HttpError(404, 'not_a_spot', 'This code isn’t a spot of this café.');
    }
    return c.json({ ...spot });
  });

  return app;
}
