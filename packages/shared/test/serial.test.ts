import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSerial } from '../src/serial.ts';

test('jobs run one after another, in the order they came', async () => {
  const serial = createSerial();
  const log: string[] = [];
  const slow = serial(async () => {
    log.push('stop: start');
    await new Promise((resolve) => setTimeout(resolve, 20));
    log.push('stop: end');
  });
  const fast = serial(async () => {
    log.push('start');
  });
  await Promise.all([slow, fast]);
  assert.deepEqual(log, ['stop: start', 'stop: end', 'start']);
});

test('a failed job does not block the next one, and its caller sees the error', async () => {
  const serial = createSerial();
  const failed = serial(async () => {
    throw new Error('no');
  });
  await assert.rejects(failed, /no/);
  assert.equal(await serial(async () => 42), 42);
});
