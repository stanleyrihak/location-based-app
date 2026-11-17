import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, send } from './helpers.ts';

test('config says fake without a Stripe key', async () => {
  const { app } = createTestApp();
  const response = await send(app, 'GET', '/config');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { payments: 'fake', stripePublishableKey: null });
});

test('config gives the publishable key with Stripe', async () => {
  const { app } = createTestApp({
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_y',
  });
  const response = await send(app, 'GET', '/config');
  assert.deepEqual(await response.json(), {
    payments: 'stripe',
    stripePublishableKey: 'pk_test_y',
  });
});

test('config says stripe with a null key when only the secret key is set', async () => {
  const { app } = createTestApp({ STRIPE_SECRET_KEY: 'sk_test_x' });
  const response = await send(app, 'GET', '/config');
  assert.deepEqual(await response.json(), { payments: 'stripe', stripePublishableKey: null });
});
