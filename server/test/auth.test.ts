import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, send } from './helpers.ts';

const PHONE = '+358401234567';

test('sign-in creates an account once', async () => {
  const { app } = createTestApp();

  assert.equal((await send(app, 'POST', '/auth/code', { phone: '+358 40 123 4567' })).status, 204);
  const first = await send(app, 'POST', '/auth/verify', { phone: PHONE, code: '123456' });
  assert.equal(first.status, 200);
  const one = (await first.json()) as { token: string; user: { id: string; phone: string } };
  assert.ok(one.token.length > 20);
  assert.equal(one.user.phone, PHONE);

  await send(app, 'POST', '/auth/code', { phone: PHONE });
  const again = (await (
    await send(app, 'POST', '/auth/verify', { phone: PHONE, code: '123456' })
  ).json()) as { user: { id: string } };
  assert.equal(again.user.id, one.user.id);
});

test('wrong code is rejected and counted', async () => {
  const { app } = createTestApp();
  await send(app, 'POST', '/auth/code', { phone: PHONE });

  const wrong = await send(app, 'POST', '/auth/verify', { phone: PHONE, code: '000000' });
  assert.equal(wrong.status, 400);
  assert.equal(((await wrong.json()) as { error: string }).error, 'wrong_code');

  for (let i = 0; i < 4; i++) {
    await send(app, 'POST', '/auth/verify', { phone: PHONE, code: '000000' });
  }
  const locked = await send(app, 'POST', '/auth/verify', { phone: PHONE, code: '123456' });
  assert.equal(locked.status, 400);
  assert.equal(((await locked.json()) as { error: string }).error, 'code_expired');
});

test('GET /me needs a token', async () => {
  const { app } = createTestApp();
  const without = await send(app, 'GET', '/me');
  assert.equal(without.status, 401);
  assert.equal(((await without.json()) as { error: string }).error, 'unauthorized');

  await send(app, 'POST', '/auth/code', { phone: PHONE });
  const { token } = (await (
    await send(app, 'POST', '/auth/verify', { phone: PHONE, code: '123456' })
  ).json()) as { token: string };
  const me = await send(app, 'GET', '/me', undefined, token);
  assert.equal(me.status, 200);
  assert.equal(((await me.json()) as { phone: string }).phone, PHONE);
});
