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
