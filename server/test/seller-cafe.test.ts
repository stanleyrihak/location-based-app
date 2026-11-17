import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, HERE, send, signInCustomer, signInSeller } from './helpers.ts';

const NEW_ORDER = {
  cafeId: 'saaripaahtimo',
  lines: [{ itemId: 'saari-cappuccino', quantity: 1 }],
  note: '',
  coordinates: HERE,
  delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
  payment: { methodId: 'wallet', label: 'Apple Pay' },
};
/** About 1 km north of HERE. */
const FAR = { latitude: HERE.latitude + 0.009, longitude: HERE.longitude };

async function setup() {
  const t = createTestApp();
  await send(t.app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  return { ...t, customer: await signInCustomer(t.app), seller: await signInSeller(t.app) };
}

test('sell from here moves the stand, and range is measured from it', async () => {
  const { app, customer, seller } = await setup();
  const moved = await send(app, 'PATCH', '/seller/cafe', { coordinates: FAR }, seller);
  assert.equal(moved.status, 200);
  assert.deepEqual(((await moved.json()) as { coordinates: unknown }).coordinates, FAR);

  const refused = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  assert.equal(refused.status, 422);
  assert.equal(((await refused.json()) as { error: string }).error, 'out_of_range');
});

test('sell from here is 409 cafe_busy while an order is unfinished', async () => {
  const { app, customer, seller } = await setup();
  const created = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  const { order } = (await created.json()) as { order: { id: string } };
  await send(app, 'POST', `/orders/${order.id}/confirm`, undefined, customer);

  const refused = await send(app, 'PATCH', '/seller/cafe', { coordinates: FAR }, seller);
  assert.equal(refused.status, 409);
  assert.equal(((await refused.json()) as { error: string }).error, 'cafe_busy');
  const cafe = (await (await send(app, 'GET', '/cafes/saaripaahtimo')).json()) as {
    coordinates: { latitude: number };
  };
  assert.notEqual(cafe.coordinates.latitude, FAR.latitude);
});

test('bad coordinates are 400 and change nothing', async () => {
  const { app, seller } = await setup();
  const refused = await send(
    app,
    'PATCH',
    '/seller/cafe',
    { coordinates: { latitude: 95, longitude: 0 }, isPaused: true },
    seller,
  );
  assert.equal(refused.status, 400);
  const cafe = (await (await send(app, 'GET', '/cafes/saaripaahtimo')).json()) as {
    isPaused: boolean;
  };
  assert.equal(cafe.isPaused, false);
});

test('the seller’s menu has every item of their café, sold out too', async () => {
  const { app, seller } = await setup();
  await send(app, 'PATCH', '/seller/menu-items/saari-cappuccino', { soldOut: true }, seller);
  const response = await send(app, 'GET', '/seller/menu', undefined, seller);
  assert.equal(response.status, 200);
  const items = (await response.json()) as { id: string; cafeId: string; soldOut: boolean }[];
  assert.ok(items.length > 0);
  assert.ok(items.every((item) => item.cafeId === 'saaripaahtimo'));
  assert.equal(items.find((item) => item.id === 'saari-cappuccino')?.soldOut, true);
});

test('a payment confirmed after the stand moved out of range is refused and released', async () => {
  const { app, customer, seller, payments } = await setup();
  const created = await send(app, 'POST', '/orders', NEW_ORDER, customer);
  const { order } = (await created.json()) as { order: { id: string } };
  // Not paid yet, so the stand can still move.
  const moved = await send(app, 'PATCH', '/seller/cafe', { coordinates: FAR }, seller);
  assert.equal(moved.status, 200);

  const confirmed = await send(app, 'POST', `/orders/${order.id}/confirm`, undefined, customer);
  assert.equal(confirmed.status, 422);
  assert.equal(((await confirmed.json()) as { error: string }).error, 'out_of_range');
  assert.equal(payments.releases.length, 1);
  const queue = (await (await send(app, 'GET', '/seller/orders', undefined, seller)).json()) as [];
  assert.equal(queue.length, 0);
});

test('an order with an out-of-date expected total is 409 price_changed', async () => {
  const { app, customer, seller } = await setup();
  const before = (await (await send(app, 'GET', '/seller/menu', undefined, seller)).json()) as {
    id: string;
    priceCents: number;
  }[];
  const oldPrice = before.find((item) => item.id === 'saari-cappuccino')?.priceCents ?? 0;
  await send(
    app,
    'PATCH',
    '/seller/menu-items/saari-cappuccino',
    { priceCents: oldPrice + 70 },
    seller,
  );

  const fee = 50;
  const stale = await send(
    app,
    'POST',
    '/orders',
    { ...NEW_ORDER, expectedTotalCents: oldPrice + fee },
    customer,
  );
  assert.equal(stale.status, 409);
  const body = (await stale.json()) as { error: string; totalCents: number };
  assert.deepEqual([body.error, body.totalCents], ['price_changed', oldPrice + 70 + fee]);

  const fresh = await send(
    app,
    'POST',
    '/orders',
    { ...NEW_ORDER, expectedTotalCents: oldPrice + 70 + fee },
    customer,
  );
  assert.equal(fresh.status, 201);
});
