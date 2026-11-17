import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, send, signInCustomer, signInSeller } from './helpers.ts';

const HERE = { latitude: 60.45, longitude: 22.27 };
const NEW_ORDER = {
  cafeId: 'saaripaahtimo',
  lines: [{ itemId: 'saari-cappuccino', quantity: 2 }],
  note: '',
  coordinates: HERE,
  delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
  payment: { methodId: 'wallet', label: 'Apple Pay' },
};
const CUSTOMER_PHONE = 'ExponentPushToken[customer-phone]';
const SELLER_PHONE = 'ExponentPushToken[seller-phone]';

async function setup() {
  const t = createTestApp();
  await send(t.app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  const customer = await signInCustomer(t.app);
  const seller = await signInSeller(t.app);
  assert.equal(
    (await send(t.app, 'POST', '/me/push-token', { token: CUSTOMER_PHONE }, customer)).status,
    204,
  );
  assert.equal(
    (await send(t.app, 'POST', '/seller/push-token', { token: SELLER_PHONE }, seller)).status,
    204,
  );
  return { ...t, customer, seller };
}

async function createOrder(app: ReturnType<typeof createTestApp>['app'], token: string) {
  const created = await send(app, 'POST', '/orders', NEW_ORDER, token);
  return ((await created.json()) as { order: { id: string } }).order.id;
}

test('a new paid order notifies the café’s sellers', async () => {
  const { app, customer, push } = await setup();
  const id = await createOrder(app, customer);
  assert.equal(push.sent.length, 0, 'creating an unpaid order notifies nobody');

  await send(app, 'POST', `/orders/${id}/confirm`, undefined, customer);
  await push.settled();
  assert.equal(push.sent.length, 1);
  assert.equal(push.sent[0].token, SELLER_PHONE);
  assert.match(push.sent[0].title, /^New order #\d+$/);
  assert.equal(push.sent[0].body, '2 items · accept within 5 minutes');
  // The app uses it to open the order, and to skip a push it already rang for.
  assert.deepEqual(push.sent[0].data, { orderId: id });
});

test('accept notifies the customer', async () => {
  const { app, customer, seller, push } = await setup();
  const id = await createOrder(app, customer);
  await send(app, 'POST', `/orders/${id}/confirm`, undefined, customer);
  await send(app, 'POST', `/seller/orders/${id}/accept`, undefined, seller);
  await push.settled();

  const last = push.sent.at(-1);
  assert.equal(last?.token, CUSTOMER_PHONE);
  assert.equal(last?.title, 'Saaripaahtimo accepted your order');
});

test('a declined order tells the customer they weren’t charged', async () => {
  const { app, customer, seller, push } = await setup();
  const id = await createOrder(app, customer);
  await send(app, 'POST', `/orders/${id}/confirm`, undefined, customer);
  await send(app, 'POST', `/seller/orders/${id}/decline`, { reason: 'sold-out' }, seller);
  await push.settled();

  const last = push.sent.at(-1);
  assert.equal(last?.title, 'Saaripaahtimo couldn’t take your order');
  assert.equal(last?.body, 'Something you ordered sold out. You haven’t been charged.');
});

test('a token that is not an Expo push token is rejected', async () => {
  const { app, customer } = await setup();
  const response = await send(app, 'POST', '/me/push-token', { token: 'hello' }, customer);
  assert.equal(response.status, 400);
});

test('signing out stops pushes to that person', async () => {
  const { app, customer, seller, push } = await setup();
  await send(app, 'POST', '/seller/auth/sign-out', undefined, seller);
  const id = await createOrder(app, customer);
  await send(app, 'POST', `/orders/${id}/confirm`, undefined, customer);
  await push.settled();
  assert.equal(push.sent.length, 0);
});
