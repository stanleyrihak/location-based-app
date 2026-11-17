import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp, send } from './helpers.ts';

type Cafe = { id: string; image: string; coordinates: { latitude: number; longitude: number } };

test('cafés are placed around the first position', async () => {
  const { app } = createTestApp();
  const response = await send(app, 'GET', '/cafes?latitude=60.45&longitude=22.27');
  assert.equal(response.status, 200);
  const cafes = (await response.json()) as Cafe[];
  assert.equal(cafes.length, 3);
  for (const cafe of cafes) {
    assert.equal(typeof cafe.coordinates.latitude, 'number');
    assert.equal(typeof cafe.coordinates.longitude, 'number');
    assert.match(cafe.image, /^http:\/\//);
  }
});

test('menu of an unknown café is 404', async () => {
  const { app } = createTestApp();
  const response = await send(app, 'GET', '/cafes/nope/menu');
  assert.equal(response.status, 404);
  assert.equal(((await response.json()) as { error: string }).error, 'cafe_not_found');
});

test('spot lookup', async () => {
  const { app } = createTestApp();
  const code = encodeURIComponent('shoot-spot:saari-table-4');

  const found = await send(app, 'GET', `/cafes/saaripaahtimo/spot?code=${code}`);
  assert.equal(found.status, 200);
  assert.equal(((await found.json()) as { label: string }).label, 'Table 4, by the window');

  const other = await send(app, 'GET', `/cafes/kampuskuppi/spot?code=${code}`);
  assert.equal(other.status, 404);
  assert.equal(((await other.json()) as { error: string }).error, 'not_a_spot');
});
