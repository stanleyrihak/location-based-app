import { db } from '../db.ts';
import { HttpError, readJson, route } from '../http.ts';
import { asCoordinates, asString } from '../validate.ts';
import { placeCafesAround } from './cafes.ts';

// Helpers for testing from the app's dev-only buttons. main.ts loads this file only outside
// production, so these routes don't exist on a real server.

/** Puts the test cafés around a new position, for example after you moved to another place. */
route('POST', '/dev/anchor', async (ctx) => {
  const body = await readJson(ctx.req);
  placeCafesAround(asCoordinates(body.coordinates, 'coordinates'));
});

/** E6: marks an item as sold out, like a café would. */
route('POST', '/dev/sell-out', async (ctx) => {
  const body = await readJson(ctx.req);
  const itemId = asString(body.itemId, 'itemId', 100);
  const { changes } = db.prepare('UPDATE menu_items SET sold_out = 1 WHERE id = ?').run(itemId);
  if (changes === 0) {
    throw new HttpError(404, 'item_not_found', 'There is no such menu item.');
  }
});
