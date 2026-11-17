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
