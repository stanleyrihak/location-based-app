import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, send, signInCustomer, signInSeller } from './helpers.ts';

type Order = { id: string; status: string; readyAt: string | null; declineReason: string | null };

const HERE = { latitude: 60.45, longitude: 22.27 };
const NEW_ORDER = {
  cafeId: 'saaripaahtimo',
  lines: [{ itemId: 'saari-cappuccino', quantity: 2 }],
  note: 'No sugar',
  coordinates: HERE,
  delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
  payment: { methodId: 'wallet', label: 'Apple Pay' },
};

async function setup() {
  const t = createTestApp();
  // Places the test cafés around HERE, as the app's first café list does.
  await send(t.app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  const customer = await signInCustomer(t.app);
  const seller = await signInSeller(t.app);
  return { ...t, customer, seller };
}

async function json<T>(response: Response) {
  return (await response.json()) as T;
}

async function paidOrder(app: ReturnType<typeof createTestApp>['app'], customer: string) {
  const created = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  assert.equal(created.status, 201);
  const { order, payment } = await json<{ order: Order; payment: { clientSecret: null } }>(
    created,
  );
  assert.equal(payment.clientSecret, null);
  const confirmed = await send(app, 'POST', `/orders/${order.id}/confirm`, undefined, customer);
  assert.equal(confirmed.status, 200);
  return json<Order>(confirmed);
}

test('the full happy path, seen by both sides', async () => {
  const { app, customer, seller } = await setup();
  const order = await paidOrder(app, customer);
  assert.equal(order.status, 'received');

  const queue = await json<Order[]>(await send(app, 'GET', '/seller/orders', undefined, seller));
  assert.deepEqual(
    queue.map((o) => o.id),
    [order.id],
  );

  for (const [step, status] of [
    ['accept', 'preparing'],
    ['on-my-way', 'on-the-way'],
    ['delivered', 'delivered'],
  ] as const) {
    const response = await send(app, 'POST', `/seller/orders/${order.id}/${step}`, undefined, seller);
    assert.equal(response.status, 200, step);
    const seen = await json<Order>(await send(app, 'GET', `/orders/${order.id}`, undefined, customer));
    assert.equal(seen.status, status);
  }
});

test('decline needs a known reason', async () => {
  const { app, customer, seller } = await setup();
  const order = await paidOrder(app, customer);
  const bad = await send(app, 'POST', `/seller/orders/${order.id}/decline`, { reason: 'meh' }, seller);
  assert.equal(bad.status, 400);
  const ok = await send(
    app,
    'POST',
    `/seller/orders/${order.id}/decline`,
    { reason: 'too-busy' },
    seller,
  );
  assert.equal((await json<Order>(ok)).declineReason, 'too-busy');
});

test('seller of another café gets 404', async () => {
  const { app, customer } = await setup();
  const order = await paidOrder(app, customer);
  const other = await signInSeller(app, 'kampuskuppi@shoot.test');

  const accept = await send(app, 'POST', `/seller/orders/${order.id}/accept`, undefined, other);
  assert.equal(accept.status, 404);
  assert.equal((await json<{ error: string }>(accept)).error, 'order_not_found');
  const queue = await json<Order[]>(await send(app, 'GET', '/seller/orders', undefined, other));
  assert.equal(queue.length, 0);
});

test('customer list hides unpaid orders', async () => {
  const { app, customer, seller } = await setup();
  await send(app, 'POST', '/orders', NEW_ORDER, customer);
  const mine = await json<Order[]>(await send(app, 'GET', '/orders', undefined, customer));
  assert.equal(mine.length, 0);
  const queue = await json<Order[]>(await send(app, 'GET', '/seller/orders', undefined, seller));
  assert.equal(queue.length, 0);
});

test('another customer cannot see or cancel the order', async () => {
  const { app, customer } = await setup();
  const order = await paidOrder(app, customer);
  const stranger = await signInCustomer(app, '+358409999999');
  assert.equal((await send(app, 'GET', `/orders/${order.id}`, undefined, stranger)).status, 404);
  assert.equal(
    (await send(app, 'POST', `/orders/${order.id}/cancel`, undefined, stranger)).status,
    404,
  );
});

test('paused café refuses new orders with 409 cafe_paused', async () => {
  const { app, customer, seller } = await setup();
  const paused = await send(app, 'PATCH', '/seller/cafe', { isPaused: true }, seller);
  assert.equal(paused.status, 200);
  assert.equal((await json<{ isPaused: boolean }>(paused)).isPaused, true);

  const refused = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  assert.equal(refused.status, 409);
  assert.equal((await json<{ error: string }>(refused)).error, 'cafe_paused');
});

test('seller marks an item sold out and a new order with it gets 409 sold_out', async () => {
  const { app, customer, seller } = await setup();
  const changed = await send(
    app,
    'PATCH',
    '/seller/menu-items/saari-cappuccino',
    { soldOut: true, priceCents: 450, description: 'Oat milk too' },
    seller,
  );
  assert.equal(changed.status, 200);
  const item = await json<{ soldOut: boolean; priceCents: number; description: string }>(changed);
  assert.deepEqual([item.soldOut, item.priceCents, item.description], [true, 450, 'Oat milk too']);

  const refused = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  assert.equal(refused.status, 409);
  const body = await json<{ error: string; itemIds: string[] }>(refused);
  assert.deepEqual([body.error, body.itemIds], ['sold_out', ['saari-cappuccino']]);
});

test("a seller can't edit another café's menu", async () => {
  const { app, seller } = await setup();
  const response = await send(
    app,
    'PATCH',
    '/seller/menu-items/kampus-soup',
    { soldOut: true },
    seller,
  );
  assert.equal(response.status, 404);
  assert.equal((await json<{ error: string }>(response)).error, 'item_not_found');
});

test('bad order bodies are 400, not 500', async () => {
  const { app, customer } = await setup();
  for (const body of [
    {},
    { ...NEW_ORDER, lines: [] },
    { ...NEW_ORDER, lines: [{ itemId: 'saari-cappuccino', quantity: 0 }] },
    { ...NEW_ORDER, delivery: { kind: 'teleport' } },
    { ...NEW_ORDER, coordinates: { latitude: 'north' } },
  ]) {
    const response = await send(app, 'POST', '/orders', body, customer);
    assert.equal(response.status, 400, JSON.stringify(body));
  }
});
