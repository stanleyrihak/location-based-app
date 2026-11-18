import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACCEPT_WINDOW_MS,
  canMove,
  isLiveStatus,
  orderToRepeat,
  paymentLine,
} from '../src/orders.ts';

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

test('the payment line says reserved until the café accepts, then paid, and not charged when it ends', () => {
  assert.equal(paymentLine('received', 'Card'), 'Reserved on Card');
  assert.equal(paymentLine('preparing', 'Card'), 'Paid with Card');
  assert.equal(paymentLine('on-the-way', 'Card'), 'Paid with Card');
  assert.equal(paymentLine('delivered', 'Card'), 'Paid with Card');
  assert.equal(paymentLine('declined', 'Card'), 'Not charged');
  assert.equal(paymentLine('expired', 'Card'), 'Not charged');
  assert.equal(paymentLine('cancelled', 'Card'), 'Not charged');
});

test('order again picks the newest finished order from a café in range, never a live one', () => {
  const orders = [
    { id: 'live', cafeId: 'a', status: 'received' as const },
    { id: 'far', cafeId: 'b', status: 'delivered' as const },
    { id: 'done', cafeId: 'a', status: 'delivered' as const },
    { id: 'older', cafeId: 'a', status: 'declined' as const },
  ];
  assert.equal(orderToRepeat(orders, ['a'])?.id, 'done');
  assert.equal(orderToRepeat(orders, ['b'])?.id, 'far');
  assert.equal(orderToRepeat([orders[0]], ['a']), undefined);
});
