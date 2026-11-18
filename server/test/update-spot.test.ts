import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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
type Deps = ReturnType<typeof createTestApp>['deps'];
type Order = {
  id: string;
  deliverTo: { latitude: number; longitude: number };
  delivery: { kind: string; spotLabel?: string; selfie?: string; spot?: string };
};

/** About 20 m north of HERE: still inside Casablanca's 100 m. */
const NEARBY = { latitude: HERE.latitude + 0.00018, longitude: HERE.longitude };
/** About 1 km north: outside every café's range. */
const FAR = { latitude: HERE.latitude + 0.009, longitude: HERE.longitude };

const SPOT_ORDER = {
  cafeId: 'saaripaahtimo',
  lines: [{ itemId: 'saari-cappuccino', quantity: 1 }],
  note: '',
  coordinates: HERE,
  delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
  payment: { methodId: 'wallet', label: 'Apple Pay' },
};

/** A photo already in the uploads folder, as if the app had uploaded it. Returns its path. */
function upload(deps: Deps) {
  const name = `${randomUUID()}.jpg`;
  writeFileSync(path.join(deps.uploadsDir, name), 'photo');
  return `/uploads/${name}`;
}

const exists = (deps: Deps, photo: string) =>
  existsSync(path.join(deps.uploadsDir, path.basename(photo)));

async function paid(app: App, customer: string, body: unknown) {
  const created = await send(app, 'POST', '/orders', body, customer);
  assert.equal(created.status, 201);
  const { order } = (await created.json()) as { order: Order };
  await send(app, 'POST', `/orders/${order.id}/confirm`, undefined, customer);
  return order.id;
}

async function setup() {
  const t = createTestApp();
  await send(t.app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  return { ...t, customer: await signInCustomer(t.app), seller: await signInSeller(t.app) };
}

const otherCode = 'shoot-spot:saari-bench-fountain';

test('a new spot code moves the delivery and the café hears it', async () => {
  const s = await startLive();
  try {
    const customer = await signInCustomer(s.app);
    const seller = await signInSeller(s.app);
    const orderId = await paid(s.app, customer, SPOT_ORDER);
    const cafe = await connect(s.url, seller);

    const response = await send(
      s.app,
      'POST',
      `/orders/${orderId}/spot`,
      { coordinates: NEARBY, delivery: { kind: 'spot', spotCode: otherCode } },
      customer,
    );
    assert.equal(response.status, 200);
    const order = (await response.json()) as Order;
    assert.deepEqual(order.deliverTo, NEARBY);
    assert.notEqual(order.delivery.spotLabel, 'Table 4, by the window');
    await wait(100);
    const last = cafe.messages.at(-1) as unknown as { order: Order };
    assert.deepEqual(last.order.deliverTo, NEARBY);
  } finally {
    await s.close();
  }
});

test('a new spot photo keeps the selfie and deletes the old spot photo', async () => {
  const { app, deps, customer } = await setup();
  const selfie = upload(deps);
  const oldSpot = upload(deps);
  const newSpot = upload(deps);
  const orderId = await paid(app, customer, {
    ...SPOT_ORDER,
    delivery: { kind: 'photos', selfie, spot: oldSpot },
  });

  const response = await send(
    app,
    'POST',
    `/orders/${orderId}/spot`,
    { coordinates: NEARBY, delivery: { kind: 'photo', spot: newSpot } },
    customer,
  );
  assert.equal(response.status, 200);
  const order = (await response.json()) as Order;
  assert.ok(order.delivery.selfie?.endsWith(selfie));
  assert.ok(order.delivery.spot?.endsWith(newSpot));
  assert.equal(exists(deps, oldSpot), false);
  assert.equal(exists(deps, selfie), true);
});

test('out of range is 422 and changes nothing', async () => {
  const { app, customer } = await setup();
  const orderId = await paid(app, customer, SPOT_ORDER);

  const response = await send(
    app,
    'POST',
    `/orders/${orderId}/spot`,
    { coordinates: FAR, delivery: { kind: 'spot', spotCode: otherCode } },
    customer,
  );
  assert.equal(response.status, 422);
  const body = (await response.json()) as { error: string; radiusM: number };
  assert.equal(body.error, 'out_of_range');
  assert.equal(body.radiusM, 100);
  const after = (await (
    await send(app, 'GET', `/orders/${orderId}`, undefined, customer)
  ).json()) as Order;
  assert.deepEqual(after.deliverTo, HERE);
});

test('a delivered order is 409', async () => {
  const { app, customer, seller } = await setup();
  const orderId = await paid(app, customer, SPOT_ORDER);
  for (const step of ['accept', 'on-my-way', 'delivered']) {
    await send(app, 'POST', `/seller/orders/${orderId}/${step}`, undefined, seller);
  }
  const response = await send(
    app,
    'POST',
    `/orders/${orderId}/spot`,
    { coordinates: NEARBY, delivery: { kind: 'spot', spotCode: otherCode } },
    customer,
  );
  assert.equal(response.status, 409);
});

test('a photo for a spot-code order is 422 needs_selfie', async () => {
  const { app, deps, customer } = await setup();
  const orderId = await paid(app, customer, SPOT_ORDER);
  const response = await send(
    app,
    'POST',
    `/orders/${orderId}/spot`,
    { coordinates: NEARBY, delivery: { kind: 'photo', spot: upload(deps) } },
    customer,
  );
  assert.equal(response.status, 422);
  assert.equal(((await response.json()) as { error: string }).error, 'needs_selfie');
});

test('someone else’s order is 404', async () => {
  const { app, customer } = await setup();
  const stranger = await signInCustomer(app, '+358409999999');
  const orderId = await paid(app, customer, SPOT_ORDER);
  const response = await send(
    app,
    'POST',
    `/orders/${orderId}/spot`,
    { coordinates: NEARBY, delivery: { kind: 'spot', spotCode: otherCode } },
    stranger,
  );
  assert.equal(response.status, 404);
});
