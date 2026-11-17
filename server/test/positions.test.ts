import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  connect,
  createTestApp,
  HERE,
  send,
  signInCustomer,
  signInSeller,
  startLive,
  wait,
} from './helpers.ts';

type App = ReturnType<typeof createTestApp>['app'];

const NEW_ORDER = {
  cafeId: 'saaripaahtimo',
  lines: [{ itemId: 'saari-cappuccino', quantity: 1 }],
  note: '',
  coordinates: HERE,
  delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
  payment: { methodId: 'wallet', label: 'Apple Pay' },
};
const WALKING = { latitude: 60.4502, longitude: 22.2703 };

/** A paid order that the café accepted and took out: status on-the-way. */
async function orderOnTheWay(app: App, customer: string, seller: string) {
  const created = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  const { order } = (await created.json()) as { order: { id: string } };
  await send(app, 'POST', `/orders/${order.id}/confirm`, undefined, customer);
  await send(app, 'POST', `/seller/orders/${order.id}/accept`, undefined, seller);
  const out = await send(app, 'POST', `/seller/orders/${order.id}/on-my-way`, undefined, seller);
  assert.equal(out.status, 200);
  return order.id;
}

const positions = (messages: { type: string }[]) =>
  messages.filter((message) => message.type.endsWith('.position'));

test('the customer gets the seller’s position while the order is on the way', async () => {
  const s = await startLive();
  try {
    const customer = await signInCustomer(s.app);
    const seller = await signInSeller(s.app);
    const orderId = await orderOnTheWay(s.app, customer, seller);
    const mine = await connect(s.url, customer);

    const sent = await send(s.app, 'POST', `/seller/orders/${orderId}/position`, WALKING, seller);
    assert.equal(sent.status, 204);
    await wait(100);

    assert.deepEqual(positions(mine.messages), [
      {
        type: 'seller.position',
        orderId,
        position: { ...WALKING, at: new Date(s.deps.now()).toISOString() },
      },
    ]);
    mine.socket.close();
  } finally {
    await s.close();
  }
});

test('the café gets the customer’s position, and the customer doesn’t get their own', async () => {
  const s = await startLive();
  try {
    const customer = await signInCustomer(s.app);
    const seller = await signInSeller(s.app);
    const orderId = await orderOnTheWay(s.app, customer, seller);
    const mine = await connect(s.url, customer);
    const cafe = await connect(s.url, seller);

    const sent = await send(s.app, 'POST', `/orders/${orderId}/position`, HERE, customer);
    assert.equal(sent.status, 204);
    await wait(100);

    assert.deepEqual(
      positions(cafe.messages).map((m) => m.type),
      ['customer.position'],
    );
    assert.deepEqual(positions(mine.messages), []);
    mine.socket.close();
    cafe.socket.close();
  } finally {
    await s.close();
  }
});

test('a position after Delivered is refused with 409 and not forwarded', async () => {
  const s = await startLive();
  try {
    const customer = await signInCustomer(s.app);
    const seller = await signInSeller(s.app);
    const orderId = await orderOnTheWay(s.app, customer, seller);
    await send(s.app, 'POST', `/seller/orders/${orderId}/delivered`, undefined, seller);
    const mine = await connect(s.url, customer);

    const late = await send(s.app, 'POST', `/seller/orders/${orderId}/position`, WALKING, seller);
    assert.equal(late.status, 409);
    assert.equal(((await late.json()) as { error: string }).error, 'status_conflict');
    await wait(100);
    assert.deepEqual(positions(mine.messages), []);
    mine.socket.close();
  } finally {
    await s.close();
  }
});

test('a position for another café’s order is 404', async () => {
  const { app } = createTestApp();
  await send(app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  const customer = await signInCustomer(app);
  const seller = await signInSeller(app);
  const otherSeller = await signInSeller(app, 'kampuskuppi@shoot.test');
  const orderId = await orderOnTheWay(app, customer, seller);

  const sent = await send(app, 'POST', `/seller/orders/${orderId}/position`, WALKING, otherSeller);
  assert.equal(sent.status, 404);
});

test('a customer can’t post to someone else’s order (404)', async () => {
  const { app } = createTestApp();
  await send(app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  const customer = await signInCustomer(app);
  const stranger = await signInCustomer(app, '+358409999999');
  const seller = await signInSeller(app);
  const orderId = await orderOnTheWay(app, customer, seller);

  const sent = await send(app, 'POST', `/orders/${orderId}/position`, HERE, stranger);
  assert.equal(sent.status, 404);
});

test('coordinates outside the globe are 400', async () => {
  const { app } = createTestApp();
  await send(app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  const customer = await signInCustomer(app);
  const seller = await signInSeller(app);
  const orderId = await orderOnTheWay(app, customer, seller);

  const sent = await send(
    app,
    'POST',
    `/seller/orders/${orderId}/position`,
    { latitude: 91, longitude: 0 },
    seller,
  );
  assert.equal(sent.status, 400);
});

test('track returns the last positions while on the way, and nothing after Delivered', async () => {
  const t = createTestApp();
  const { app } = t;
  await send(app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  const customer = await signInCustomer(app);
  const seller = await signInSeller(app);
  const orderId = await orderOnTheWay(app, customer, seller);

  const empty = await send(app, 'GET', `/orders/${orderId}/track`, undefined, customer);
  assert.deepEqual(await empty.json(), { seller: null, customer: null });

  await send(app, 'POST', `/seller/orders/${orderId}/position`, WALKING, seller);
  await send(app, 'POST', `/orders/${orderId}/position`, HERE, customer);
  const at = new Date(t.deps.now()).toISOString();

  const forCustomer = await send(app, 'GET', `/orders/${orderId}/track`, undefined, customer);
  assert.deepEqual(await forCustomer.json(), {
    seller: { ...WALKING, at },
    customer: { ...HERE, at },
  });
  const forSeller = await send(app, 'GET', `/seller/orders/${orderId}/track`, undefined, seller);
  assert.equal(forSeller.status, 200);

  await send(app, 'POST', `/seller/orders/${orderId}/delivered`, undefined, seller);
  const after = await send(app, 'GET', `/orders/${orderId}/track`, undefined, customer);
  assert.deepEqual(await after.json(), { seller: null, customer: null });
});
