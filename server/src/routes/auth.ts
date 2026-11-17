import { randomBytes, randomInt, randomUUID } from 'node:crypto';

import { requireUser } from '../auth.ts';
import { config } from '../config.ts';
import { db } from '../db.ts';
import { HttpError, readJson, route } from '../http.ts';
import { asPhone, asString } from '../validate.ts';

const CODE_LIFETIME_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

/** Saves a new code for the number and "texts" it (prints it in the terminal). */
function sendCode(phone: string) {
  const code = config.fixedSmsCode || String(randomInt(0, 1_000_000)).padStart(6, '0');
  db.prepare(
    `INSERT INTO login_codes (phone, code, expires_at, attempts) VALUES (?, ?, ?, 0)
     ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at,
       attempts = 0`,
  ).run(phone, code, Date.now() + CODE_LIFETIME_MS);
  console.log(`[sms] Code for ${phone}: ${code}`);
}

/** Checks a code and uses it up. Throws if it's wrong, old, or guessed too many times. */
function useCode(phone: string, code: string) {
  const row = db
    .prepare('SELECT code, expires_at AS expiresAt, attempts FROM login_codes WHERE phone = ?')
    .get(phone) as { code: string; expiresAt: number; attempts: number } | undefined;

  if (!row || row.expiresAt < Date.now() || row.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(400, 'code_expired', 'This code has expired. Ask for a new one.');
  }
  if (row.code !== code) {
    // Counting wrong tries stops anyone from simply trying all million codes.
    db.prepare('UPDATE login_codes SET attempts = attempts + 1 WHERE phone = ?').run(phone);
    throw new HttpError(400, 'wrong_code', 'That code isn’t right. Check the SMS and try again.');
  }
  db.prepare('DELETE FROM login_codes WHERE phone = ?').run(phone);
}

/** 1.2: "Send code". Works the same for new and existing users. */
route('POST', '/auth/code', async (ctx) => {
  const body = await readJson(ctx.req);
  sendCode(asPhone(body.phone));
});

/** 1.3: "Verify". Signs in, and creates the account the first time. */
route('POST', '/auth/verify', async (ctx) => {
  const body = await readJson(ctx.req);
  const phone = asPhone(body.phone);
  useCode(phone, asString(body.code, 'code', 10));

  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, phone, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').run(
    randomUUID(),
    phone,
    now,
  );
  const user = db
    .prepare('SELECT id, phone, created_at AS createdAt FROM users WHERE phone = ?')
    .get(phone) as { id: string; phone: string; createdAt: string };

  // 32 random bytes: impossible to guess. The app keeps it and sends it with every request.
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
    token,
    user.id,
    now,
  );
  return { token, user: { ...user } };
});

route('POST', '/auth/sign-out', (ctx) => {
  requireUser(ctx);
  const token = (ctx.req.headers.authorization ?? '').slice('Bearer '.length);
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
});

route('GET', '/me', (ctx) => requireUser(ctx));

/**
 * Change the phone number (Profile). First POST /auth/code with the new number, then this
 * with the code, which proves the user owns the new number.
 */
route('POST', '/me/phone', async (ctx) => {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const phone = asPhone(body.phone);

  const taken = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone, user.id);
  if (taken) {
    throw new HttpError(409, 'phone_taken', 'Another account already uses this number.');
  }
  useCode(phone, asString(body.code, 'code', 10));
  db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone, user.id);
  return { ...user, phone };
});

/**
 * Delete the account (Apple requires this in apps that let you sign up). Sessions go with it.
 * Orders stay without a user, because the café needs them for its accounts.
 */
route('DELETE', '/me', (ctx) => {
  const user = requireUser(ctx);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
});
