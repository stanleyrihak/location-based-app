import type { UpgradeWebSocket } from 'hono/ws';
import { Hono } from 'hono';

import type { Deps } from '../deps.ts';
import type { Listener } from '../realtime/hub.ts';
import { originOf } from '../request.ts';

/** Close code for "who are you?": 4000–4999 are free for apps; 4401 echoes HTTP 401. */
const UNAUTHORIZED = 4401;

/**
 * GET /ws?token=… opens a WebSocket that receives the signed-in person's order changes.
 *
 * The token goes in the address because React Native's WebSocket can't reliably send an
 * Authorization header on iOS. It's the same token as for normal requests.
 */
export function liveRoutes(deps: Deps, upgradeWebSocket: UpgradeWebSocket) {
  const app = new Hono();

  /** A customer token gives the customer, a seller token the seller's café, else null. */
  function whoIs(token: string): Listener | null {
    const row = deps.db
      .prepare(
        `SELECT sessions.user_id AS userId, staff.cafe_id AS cafeId
         FROM sessions LEFT JOIN staff ON staff.id = sessions.staff_id
         WHERE sessions.token = ?`,
      )
      .get(token) as { userId: string | null; cafeId: string | null } | undefined;
    if (row?.userId) return { userId: row.userId };
    if (row?.cafeId) return { cafeId: row.cafeId };
    return null;
  }

  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      const who = whoIs(c.req.query('token') ?? '');
      const origin = originOf(c);
      let detach: (() => void) | undefined;

      return {
        onOpen(_event, ws) {
          if (!who) {
            ws.close(UNAUTHORIZED, 'Sign in first.');
            return;
          }
          detach = deps.hub.attach(ws, who, origin);
        },
        onClose() {
          detach?.();
        },
      };
    }),
  );

  return app;
}
