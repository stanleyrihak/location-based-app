import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACCEPT_WINDOW_MS, canMove, isLiveStatus } from '../src/orders.ts';

test('statuses only move forward', () => {
  assert.equal(canMove('received', 'preparing'), true);
  assert.equal(canMove('preparing', 'received'), false);
  assert.equal(canMove('delivered', 'on-the-way'), false);
  assert.equal(canMove('pending-payment', 'received'), true);
  assert.equal(canMove('preparing', 'declined'), false);
});

test('only received, preparing and on-the-way are live', () => {
  assert.equal(isLiveStatus('received'), true);
  assert.equal(isLiveStatus('on-the-way'), true);
  assert.equal(isLiveStatus('declined'), false);
  assert.equal(isLiveStatus('delivered'), false);
});

test('the café has five minutes to accept', () => {
  assert.equal(ACCEPT_WINDOW_MS, 300_000);
});

test('countdown from acceptBy', async () => {
  const { formatCountdown, secondsToAccept } = await import('../src/orders.ts');
  const now = Date.parse('2026-11-17T09:00:00Z');
  const in65s = new Date(now + 65_000).toISOString();
  assert.equal(secondsToAccept({ acceptBy: in65s }, now), 65);
  assert.equal(formatCountdown(65), '1:05');
  assert.equal(secondsToAccept({ acceptBy: new Date(now - 1000).toISOString() }, now), 0);
  assert.equal(secondsToAccept({ acceptBy: null }, now), null);
});

test('queue groups and orders', async () => {
  const { groupSellerQueue } = await import('../src/orders.ts');
  const make = (id: string, status: string, createdAt: string) =>
    ({ id, status, createdAt, updatedAt: createdAt }) as never;
  const queue = groupSellerQueue([
    make('late', 'received', '2026-11-17T09:05:00Z'),
    make('early', 'received', '2026-11-17T09:00:00Z'),
    make('making', 'preparing', '2026-11-17T08:50:00Z'),
    make('gone', 'declined', '2026-11-17T08:40:00Z'),
  ]);
  assert.deepEqual(
    queue.newOrders.map((o) => o.id),
    ['early', 'late'],
  );
  assert.deepEqual(
    queue.preparing.map((o) => o.id),
    ['making'],
  );
  assert.deepEqual(
    queue.recent.map((o) => o.id),
    ['gone'],
  );
  assert.equal(queue.onTheWay.length, 0);
});

test('deliveringOrderId is the on-the-way order', async () => {
  const { deliveringOrderId } = await import('../src/orders.ts');
  const o = (id: string, status: string) => ({ id, status }) as never;
  assert.equal(deliveringOrderId([o('a', 'preparing'), o('b', 'on-the-way')]), 'b');
  assert.equal(deliveringOrderId([o('a', 'delivered')]), null);
  assert.equal(deliveringOrderId(undefined), null);
});
