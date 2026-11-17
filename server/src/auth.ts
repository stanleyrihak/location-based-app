import { timingSafeEqual } from 'node:crypto';

import { config } from './config.ts';
import { db } from './db.ts';
import { type Context, HttpError } from './http.ts';

export type User = { id: string; phone: string; createdAt: string };

/**
 * The signed-in user, from the "Authorization: Bearer <token>" header. Throws 401 when the
 * token is missing or unknown; the app then sends the user back to sign-in.
 */
export function requireUser(ctx: Context): User {
  const header = ctx.req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const row = db
    .prepare(
      `SELECT users.id, users.phone, users.created_at AS createdAt
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token) as User | undefined;

  if (!row) {
    throw new HttpError(401, 'unauthorized', 'Sign in first.');
  }
  return { ...row };
}

/**
 * Café staff, for now one shared key in the X-Staff-Key header. Real staff accounts would
 * belong to one café each, so a café could only see and change its own orders.
 */
export function requireStaff(ctx: Context) {
  const given = Buffer.from(String(ctx.req.headers['x-staff-key'] ?? ''));
  const expected = Buffer.from(config.staffKey);
  // timingSafeEqual takes as long for a wrong first letter as for a wrong last one, so the
  // response time doesn't give the key away letter by letter.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(401, 'unauthorized', 'Staff only.');
  }
}
