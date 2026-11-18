import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, send, signInCustomer, signInSeller } from './helpers.ts';

test('seller signs in with the seeded account', async () => {
  const { app } = createTestApp();
  const response = await send(app, 'POST', '/seller/auth/sign-in', {
    email: 'seller@shoot.com',
    password: '1234',
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    token: string;
    seller: { email: string; cafe: { id: string } };
  };
  assert.ok(body.token.length > 20);
  assert.equal(body.seller.cafe.id, 'saaripaahtimo');

  const me = await send(app, 'GET', '/seller/me', undefined, body.token);
  assert.equal(me.status, 200);
  assert.equal(((await me.json()) as { email: string }).email, 'seller@shoot.com');
});

test('wrong password and unknown email give the same 401', async () => {
  const { app } = createTestApp();
  const wrong = await send(app, 'POST', '/seller/auth/sign-in', {
    email: 'seller@shoot.com',
    password: 'nope',
  });
  const unknown = await send(app, 'POST', '/seller/auth/sign-in', {
    email: 'nobody@shoot.com',
    password: '1234',
  });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
});

test('customer token is rejected on /seller/me', async () => {
  const { app } = createTestApp();
  const token = await signInCustomer(app);
  assert.equal((await send(app, 'GET', '/seller/me', undefined, token)).status, 401);
});

test('seller token is rejected on /me', async () => {
  const { app } = createTestApp();
  const token = await signInSeller(app);
  assert.equal((await send(app, 'GET', '/me', undefined, token)).status, 401);
});

test('stored hash is not the password', async () => {
  const { deps } = createTestApp();
  const { password_hash } = deps.db
    .prepare('SELECT password_hash FROM staff WHERE email = ?')
    .get('seller@shoot.com') as { password_hash: string };
  assert.notEqual(password_hash, '1234');
  assert.match(password_hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]+$/);
});

test('signing out ends the seller session', async () => {
  const { app } = createTestApp();
  const token = await signInSeller(app);
  assert.equal((await send(app, 'POST', '/seller/auth/sign-out', undefined, token)).status, 204);
  assert.equal((await send(app, 'GET', '/seller/me', undefined, token)).status, 401);
});
