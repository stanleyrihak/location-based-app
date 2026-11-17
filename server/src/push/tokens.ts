import type { DatabaseSync } from 'node:sqlite';

import { Expo } from 'expo-server-sdk';

import { HttpError } from '../errors.ts';

/**
 * Remembers which phone belongs to whom. A token belongs to one person at a time: if another
 * account signs in on the same phone, the token moves to that account.
 */
export function savePushToken(
  db: DatabaseSync,
  token: unknown,
  owner: { userId: string } | { staffId: string },
  now: number,
) {
  if (!Expo.isExpoPushToken(token)) {
    throw new HttpError(400, 'invalid_field', '"token" must be an Expo push token.', {
      field: 'token',
    });
  }
  const userId = 'userId' in owner ? owner.userId : null;
  const staffId = 'staffId' in owner ? owner.staffId : null;
  db.prepare(
    `INSERT INTO push_tokens (token, user_id, staff_id, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, staff_id = excluded.staff_id`,
  ).run(token, userId, staffId, new Date(now).toISOString());
}
