import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyOrderUpdate, applyPosition, reconnectDelayMs } from '../src/live.ts';
import type { Order, PositionMessage } from '../src/types.ts';

function order(id: string, createdAt: string, updatedAt = createdAt, status = 'received'): Order {
  return { id, createdAt, updatedAt, status } as Order;
}

test('adds an unknown order newest first', () => {
  const list = [order('a', '2026-11-17T09:00:00Z')];
  const next = applyOrderUpdate(list, order('b', '2026-11-17T09:05:00Z'));
  assert.deepEqual(
    next?.map((o) => o.id),
    ['b', 'a'],
  );
});

test('replaces a known order', () => {
  const list = [order('a', '2026-11-17T09:00:00Z')];
  const next = applyOrderUpdate(
    list,
    order('a', '2026-11-17T09:00:00Z', '2026-11-17T09:01:00Z', 'preparing'),
  );
  assert.deepEqual(
    next?.map((o) => o.status),
    ['preparing'],
  );
});

test('ignores an older update', () => {
  const list = [order('a', '2026-11-17T09:00:00Z', '2026-11-17T09:02:00Z', 'preparing')];
  const next = applyOrderUpdate(
    list,
    order('a', '2026-11-17T09:00:00Z', '2026-11-17T09:01:00Z', 'received'),
  );
  assert.equal(next?.[0].status, 'preparing');
});

test('leaves an empty cache empty', () => {
  assert.equal(applyOrderUpdate(undefined, order('a', '2026-11-17T09:00:00Z')), undefined);
});

test('reconnect delays double and cap at 30 s', () => {
  assert.deepEqual([0, 1, 2, 5, 10].map(reconnectDelayMs), [1000, 2000, 4000, 30000, 30000]);
});

const at = (time: string) => `2026-11-17T${time}Z`;
function msg(type: PositionMessage['type'], time: string): PositionMessage {
  return { type, orderId: 'a', position: { latitude: 60.45, longitude: 22.27, at: at(time) } };
}

test('applyPosition puts the seller position into an empty track', () => {
  const track = applyPosition(undefined, msg('seller.position', '09:00:05'));
  assert.equal(track.seller?.at, at('09:00:05'));
  assert.equal(track.customer, null);
});

test('applyPosition ignores an older position than the one it has', () => {
  const track = applyPosition(
    applyPosition(undefined, msg('seller.position', '09:00:10')),
    msg('seller.position', '09:00:05'),
  );
  assert.equal(track.seller?.at, at('09:00:10'));
});

test('applyPosition keeps the other side', () => {
  const track = applyPosition(
    applyPosition(undefined, msg('customer.position', '09:00:01')),
    msg('seller.position', '09:00:05'),
  );
  assert.equal(track.customer?.at, at('09:00:01'));
  assert.equal(track.seller?.at, at('09:00:05'));
});
