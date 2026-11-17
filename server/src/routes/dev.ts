import { Hono } from 'hono';

import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { readJson } from '../request.ts';
import { asCoordinates, asString } from '../validate.ts';
import { placeCafesAround } from './cafes.ts';

// Helpers for testing from the app's dev-only buttons. app.ts mounts these only outside
// production, so they don't exist on a real server.
export function devRoutes(deps: Deps) {
  const app = new Hono();

  /** Puts the test cafés around a new position, for example after you moved to another place. */
  app.post('/dev/anchor', async (c) => {
    const body = await readJson(c);
    placeCafesAround(deps.db, asCoordinates(body.coordinates, 'coordinates'));
    return c.body(null, 204);
  });

  /** E6: marks an item as sold out, like a café would. */
  app.post('/dev/sell-out', async (c) => {
    const body = await readJson(c);
    const itemId = asString(body.itemId, 'itemId', 100);
    const { changes } = deps.db
      .prepare('UPDATE menu_items SET sold_out = 1 WHERE id = ?')
      .run(itemId);
    if (changes === 0) {
      throw new HttpError(404, 'item_not_found', 'There is no such menu item.');
    }
    return c.body(null, 204);
  });

  return app;
}
