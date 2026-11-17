import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFakePayments } from '../src/payments/fake.ts';

test('card-0002 is never reserved', async () => {
  const payments = createFakePayments();
  const declined = await payments.reserve(470, 'card-0002');
  const paid = await payments.reserve(470, 'wallet');
  assert.equal(await payments.isReserved(declined.paymentId), false);
  assert.equal(await payments.isReserved(paid.paymentId), true);
  assert.equal(paid.clientSecret, null);
});

test('capture and release are recorded', async () => {
  const payments = createFakePayments();
  await payments.capture('p1');
  await payments.release('p2');
  assert.deepEqual(payments.captures, ['p1']);
  assert.deepEqual(payments.releases, ['p2']);
});

test('failNextCapture makes one capture throw', async () => {
  const payments = createFakePayments();
  payments.failNextCapture();
  await assert.rejects(payments.capture('p1'));
  await payments.capture('p2');
  assert.deepEqual(payments.captures, ['p2']);
});

test('an unknown payment is not reserved', async () => {
  const payments = createFakePayments();
  assert.equal(await payments.isReserved('nope'), false);
});
