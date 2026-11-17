import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import type { Deps } from '../src/deps.ts';
import {
  abandonUnpaid,
  acceptOrder,
  cancelOrder,
  confirmPayment,
  createOrder,
  declineOrder,
  expireOverdue,
  markDelivered,
  type NewOrderInput,
  startDelivery,
} from '../src/domain/orders.ts';
import { HttpError } from '../src/errors.ts';
import { placeCafesAround } from '../src/routes/cafes.ts';
import { createTestApp } from './helpers.ts';

const HERE = { latitude: 60.45, longitude: 22.27 };
const CAFE = 'saaripaahtimo'; // 45 m from HERE, delivers within 100 m, ready in 10 min

function setup() {
  const t = createTestApp();
  placeCafesAround(t.deps.db, HERE);
  const userId = randomUUID();
  t.deps.db
    .prepare('INSERT INTO users (id, phone, created_at) VALUES (?, ?, ?)')
    .run(userId, '+358401234567', new Date(t.deps.now()).toISOString());
  return { ...t, userId };
}

function input(overrides: Partial<NewOrderInput> = {}): NewOrderInput {
  return {
    cafeId: CAFE,
    lines: [{ itemId: 'saari-cappuccino', quantity: 1 }],
    note: '',
    coordinates: HERE,
    delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
    payment: { methodId: 'wallet', label: 'Apple Pay' },
    ...overrides,
  };
}

/** Creates and pays an order: it's then `received`, waiting for the café. */
async function paidOrder(deps: Deps, userId: string, overrides: Partial<NewOrderInput> = {}) {
  const { order } = await createOrder(deps, userId, input(overrides));
  return confirmPayment(deps, userId, order.id);
}

async function rejects(promise: Promise<unknown>, status: number, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof HttpError, `expected HttpError, got ${String(error)}`);
    assert.equal(error.status, status);
    assert.equal(error.code, code);
    return true;
  });
}

test('paying reserves and confirming makes it received with a 5-minute deadline', async () => {
  const { deps, userId } = setup();
  const { order } = await createOrder(deps, userId, input());
  assert.equal(order.status, 'pending-payment');

  const received = await confirmPayment(deps, userId, order.id);
  assert.equal(received.status, 'received');
  assert.equal(Date.parse(received.accept_by ?? ''), deps.now() + 300_000);
  assert.equal(received.ready_at, null);
});

test('a declined card stays unpaid', async () => {
  const { deps, userId } = setup();
  const { order } = await createOrder(
    deps,
    userId,
    input({ payment: { methodId: 'card-0002', label: 'Card' } }),
  );
  await rejects(confirmPayment(deps, userId, order.id), 402, 'payment_declined');
});

test('accept captures once and sets readyAt from accept time', async () => {
  const { deps, userId, clock, payments } = setup();
  const order = await paidOrder(deps, userId);
  clock.advance(60_000);

  const accepted = await acceptOrder(deps, CAFE, order.id);
  assert.equal(accepted.status, 'preparing');
  assert.equal(payments.captures.length, 1);
  assert.equal(Date.parse(accepted.ready_at ?? ''), deps.now() + 10 * 60_000);
});

test('second accept is a 409 and captures nothing more', async () => {
  const { deps, userId, payments } = setup();
  const order = await paidOrder(deps, userId);

  // Both at once, like a double tap: only one may take the money.
  const results = await Promise.allSettled([
    acceptOrder(deps, CAFE, order.id),
    acceptOrder(deps, CAFE, order.id),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(payments.captures.length, 1);

  await rejects(acceptOrder(deps, CAFE, order.id), 409, 'status_conflict');
  assert.equal(payments.captures.length, 1);
});

test('accept after the deadline expires the order and releases the money', async () => {
  const { deps, userId, clock, payments } = setup();
  const order = await paidOrder(deps, userId);
  clock.advance(300_001);

  await rejects(acceptOrder(deps, CAFE, order.id), 409, 'expired');
  const row = deps.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id) as {
    status: string;
  };
  assert.equal(row.status, 'expired');
  assert.equal(payments.captures.length, 0);
  assert.equal(payments.releases.length, 1);
});

test('capture failure leaves the order received', async () => {
  const { deps, userId, payments } = setup();
  const order = await paidOrder(deps, userId);
  payments.failNextCapture();

  await rejects(acceptOrder(deps, CAFE, order.id), 402, 'payment_failed');
  const row = deps.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id) as {
    status: string;
  };
  assert.equal(row.status, 'received');
});

test('decline releases and stores the reason', async () => {
  const { deps, userId, payments } = setup();
  const order = await paidOrder(deps, userId);

  const declined = await declineOrder(deps, CAFE, order.id, 'sold-out');
  assert.equal(declined.status, 'declined');
  assert.equal(declined.decline_reason, 'sold-out');
  assert.equal(payments.releases.length, 1);
});

test('customer can cancel only while received', async () => {
  const { deps, userId, payments } = setup();
  const first = await paidOrder(deps, userId);
  const cancelled = await cancelOrder(deps, userId, first.id);
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(payments.releases.length, 1);

  const second = await paidOrder(deps, userId);
  await acceptOrder(deps, CAFE, second.id);
  await rejects(cancelOrder(deps, userId, second.id), 409, 'status_conflict');
});

test('expireOverdue expires only orders past their deadline', async () => {
  const { deps, userId, clock } = setup();
  const old = await paidOrder(deps, userId);
  clock.advance(200_000);
  const fresh = await paidOrder(deps, userId);
  clock.advance(100_001);

  assert.equal(await expireOverdue(deps), 1);
  const status = (id: string) =>
    (deps.db.prepare('SELECT status FROM orders WHERE id = ?').get(id) as { status: string })
      .status;
  assert.equal(status(old.id), 'expired');
  assert.equal(status(fresh.id), 'received');
});

test('abandonUnpaid releases pending orders older than 30 minutes', async () => {
  const { deps, userId, clock, payments } = setup();
  const { order } = await createOrder(deps, userId, input());
  clock.advance(30 * 60_000 - 1);
  assert.equal(await abandonUnpaid(deps), 0);
  clock.advance(2);
  assert.equal(await abandonUnpaid(deps), 1);
  const row = deps.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id) as {
    status: string;
  };
  assert.equal(row.status, 'abandoned');
  assert.equal(payments.releases.length, 1);
});

test('delivered order deletes its photos', async () => {
  const { deps, userId } = setup();
  const names = [`${randomUUID()}.jpg`, `${randomUUID()}.jpg`];
  for (const name of names) writeFileSync(path.join(deps.uploadsDir, name), 'photo');

  const order = await paidOrder(deps, userId, {
    delivery: { kind: 'photos', selfie: `/uploads/${names[0]}`, spot: `/uploads/${names[1]}` },
  });
  await acceptOrder(deps, CAFE, order.id);
  await startDelivery(deps, CAFE, order.id);
  const delivered = await markDelivered(deps, CAFE, order.id);

  assert.equal(delivered.status, 'delivered');
  for (const name of names) assert.equal(existsSync(path.join(deps.uploadsDir, name)), false);
});

test('on-the-way needs preparing first', async () => {
  const { deps, userId } = setup();
  const order = await paidOrder(deps, userId);
  await rejects(startDelivery(deps, CAFE, order.id), 409, 'status_conflict');
});

test('another café cannot touch the order', async () => {
  const { deps, userId } = setup();
  const order = await paidOrder(deps, userId);
  await rejects(acceptOrder(deps, 'kampuskuppi', order.id), 404, 'order_not_found');
});

test('the checks run before any money is reserved', async () => {
  const { deps, userId, payments } = setup();
  const far = { latitude: 60.46, longitude: 22.27 };
  await rejects(createOrder(deps, userId, input({ coordinates: far })), 422, 'out_of_range');
  await rejects(
    createOrder(deps, userId, input({ lines: [{ itemId: 'saari-espresso', quantity: 1 }] })),
    409,
    'sold_out',
  );
  deps.db.prepare('UPDATE cafes SET is_paused = 1 WHERE id = ?').run(CAFE);
  await rejects(createOrder(deps, userId, input()), 409, 'cafe_paused');
  assert.equal(payments.captures.length + payments.releases.length, 0);
});
