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
