import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePriceInput } from '../src/price.ts';

test('parsePriceInput reads euros with a comma or a point', () => {
  assert.equal(parsePriceInput('3,50'), 350);
  assert.equal(parsePriceInput('3.50'), 350);
  assert.equal(parsePriceInput('3.5'), 350);
  assert.equal(parsePriceInput('3'), 300);
  assert.equal(parsePriceInput(' 4,20 '), 420);
});

test('parsePriceInput refuses what isn’t a price', () => {
  for (const text of ['', 'abc', '-1', '3.555', '3,5,0', '1000']) {
    assert.equal(parsePriceInput(text), null, text);
  }
});
