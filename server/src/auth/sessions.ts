import type { Context } from 'hono';

import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { bearerToken } from '../request.ts';

export type User = { id: string; phone: string; createdAt: string };

/**
 * The signed-in customer, from the "Authorization: Bearer <token>" header. Throws 401 when the
 * token is missing or unknown; the app then sends the user back to sign-in.
 */
export function requireUser(c: Context, deps: Deps): User {
  const row = deps.db
    .prepare(
      `SELECT users.id, users.phone, users.created_at AS createdAt
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(bearerToken(c)) as User | undefined;

  if (!row) {
    throw new HttpError(401, 'unauthorized', 'Sign in first.');
  }
  return { ...row };
}

export type Seller = { staffId: string; cafeId: string; name: string; email: string };

/** The signed-in seller. A customer's token gives 401 here, and a seller's token on /me. */
export function requireSeller(c: Context, deps: Deps): Seller {
  const row = deps.db
    .prepare(
      `SELECT staff.id AS staffId, staff.cafe_id AS cafeId, staff.name, staff.email
       FROM sessions JOIN staff ON staff.id = sessions.staff_id
       WHERE sessions.token = ?`,
    )
    .get(bearerToken(c)) as Seller | undefined;

  if (!row) {
    throw new HttpError(401, 'unauthorized', 'Sign in as the café first.');
  }
  return { ...row };
}
