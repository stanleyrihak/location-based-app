import { randomBytes } from 'node:crypto';

import { Hono } from 'hono';

import { hashPasswordSync, verifyPassword } from '../auth/passwords.ts';
import { requireSeller } from '../auth/sessions.ts';
import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { savePushToken } from '../push/tokens.ts';
import { bearerToken, originOf, readJson } from '../request.ts';
import { type CafeRow, toCafe } from '../views.ts';
import { asString } from '../validate.ts';
import { getCafeRow } from './cafes.ts';

// Compared against when the email is unknown, so a wrong email takes as long as a wrong
// password: the response time mustn't reveal which emails have accounts.
const DUMMY_HASH = hashPasswordSync('not a real password');

/** Seller sign-in by email and password. Accounts come from a script, not from sign-up. */
export function sellerAuthRoutes(deps: Deps) {
  const { db } = deps;
  const app = new Hono();

  function sellerJson(staffId: string, origin: string) {
    const staff = db
      .prepare('SELECT id, cafe_id, email, name FROM staff WHERE id = ?')
      .get(staffId) as { id: string; cafe_id: string; email: string; name: string };
    const cafe: CafeRow = getCafeRow(db, staff.cafe_id);
    return { id: staff.id, name: staff.name, email: staff.email, cafe: toCafe(cafe, origin) };
  }

  app.post('/seller/auth/sign-in', async (c) => {
    const body = await readJson(c);
    const email = asString(body.email, 'email', 200).trim().toLowerCase();
    const password = asString(body.password, 'password', 200);

    const staff = db
      .prepare('SELECT id, password_hash FROM staff WHERE email = ?')
      .get(email) as { id: string; password_hash: string } | undefined;
    const ok = await verifyPassword(password, staff?.password_hash ?? DUMMY_HASH);
    if (!staff || !ok) {
      // The same answer for both cases, again so nobody can find out which emails exist.
      throw new HttpError(401, 'wrong_credentials', 'Wrong email or password.');
    }

    const token = randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO sessions (token, staff_id, created_at) VALUES (?, ?, ?)').run(
      token,
      staff.id,
      new Date(deps.now()).toISOString(),
    );
    return c.json({ token, seller: sellerJson(staff.id, originOf(c)) });
  });

  app.post('/seller/auth/sign-out', (c) => {
    const seller = requireSeller(c, deps);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(bearerToken(c));
    // A signed-out phone shouldn't keep ringing for new orders.
    db.prepare('DELETE FROM push_tokens WHERE staff_id = ?').run(seller.staffId);
    return c.body(null, 204);
  });

  /** The seller app registers its Expo push token after sign-in, to hear about new orders. */
  app.post('/seller/push-token', async (c) => {
    const seller = requireSeller(c, deps);
    savePushToken(db, (await readJson(c)).token, { staffId: seller.staffId }, deps.now());
    return c.body(null, 204);
  });

  app.get('/seller/me', (c) => c.json(sellerJson(requireSeller(c, deps).staffId, originOf(c))));

  return app;
}
