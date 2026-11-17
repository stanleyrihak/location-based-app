import { db } from '../db.ts';
import { type Coordinates, moveBy } from '../geo.ts';
import { HttpError, route } from '../http.ts';
import { type CafeRow, type MenuItemRow, toCafe, toMenuItem } from '../views.ts';

/**
 * Test data only: the cafés have no real address. The first time someone asks for cafés,
 * they are placed around that position (each at its seeded offset) and saved. So the app
 * works wherever you test it, and walking away really changes the distance.
 * POST /dev/anchor moves them again.
 */
export function placeCafesAround(anchor: Coordinates) {
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

export function getCafeRow(id: string): CafeRow {
  const row = db.prepare('SELECT * FROM cafes WHERE id = ?').get(id) as CafeRow | undefined;
  if (!row) {
    throw new HttpError(404, 'cafe_not_found', 'There is no café with this id.');
  }
  return row;
}

/** Cafés near a position. The app works out distance and "in range" for the list. */
route('GET', '/cafes', (ctx) => {
  const latitude = Number(ctx.url.searchParams.get('latitude'));
  const longitude = Number(ctx.url.searchParams.get('longitude'));
  if (!ctx.url.searchParams.has('latitude') || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new HttpError(400, 'invalid_field', 'Send ?latitude=…&longitude=…', {
      field: 'latitude',
    });
  }

  const unplaced = db.prepare('SELECT 1 FROM cafes WHERE latitude IS NULL LIMIT 1').get();
  if (unplaced) placeCafesAround({ latitude, longitude });

  // A real server would only return cafés within a few kilometres (a geo index does that).
  const rows = db.prepare('SELECT * FROM cafes ORDER BY name').all() as CafeRow[];
  return rows.map((row) => toCafe(row, ctx.origin));
});

route('GET', '/cafes/:id', (ctx) => toCafe(getCafeRow(ctx.params.id), ctx.origin));

route('GET', '/cafes/:id/menu', (ctx) => {
  getCafeRow(ctx.params.id);
  const rows = db
    .prepare('SELECT * FROM menu_items WHERE cafe_id = ? ORDER BY position')
    .all(ctx.params.id) as MenuItemRow[];
  return rows.map((row) => toMenuItem(row, ctx.origin));
});

/** Products of several cafés at once, for search on Home: ?cafeIds=a,b,c */
route('GET', '/menu-items', (ctx) => {
  const ids = (ctx.url.searchParams.get('cafeIds') ?? '').split(',').filter(Boolean).slice(0, 50);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT * FROM menu_items WHERE cafe_id IN (${placeholders}) ORDER BY cafe_id, position`,
    )
    .all(...ids) as MenuItemRow[];
  return rows.map((row) => toMenuItem(row, ctx.origin));
});

/** 2.6: which spot a scanned QR code belongs to. 404 means E5 "This code doesn't work here". */
route('GET', '/cafes/:id/spot', (ctx) => {
  const code = ctx.url.searchParams.get('code') ?? '';
  const spot = db
    .prepare('SELECT id, cafe_id AS cafeId, label, code FROM spots WHERE cafe_id = ? AND code = ?')
    .get(ctx.params.id, code);
  if (!spot) {
    throw new HttpError(404, 'not_a_spot', 'This code isn’t a spot of this café.');
  }
  return { ...spot };
});
