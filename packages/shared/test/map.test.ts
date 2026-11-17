import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitCamera } from '../src/map.ts';

test('fitCamera centres on one point at street zoom', () => {
  assert.deepEqual(fitCamera([{ latitude: 60.45, longitude: 22.27 }]), {
    coordinates: { latitude: 60.45, longitude: 22.27 },
    zoom: 17,
  });
});

test('fitCamera centres between two points and zooms out to fit them', () => {
  const camera = fitCamera([
    { latitude: 60.45, longitude: 22.27 },
    { latitude: 60.452, longitude: 22.275 },
  ]);
  assert.ok(Math.abs(camera.coordinates.latitude - 60.451) < 1e-9);
  assert.ok(Math.abs(camera.coordinates.longitude - 22.2725) < 1e-9);
  assert.ok(camera.zoom < 17 && camera.zoom >= 14, `zoom ${camera.zoom}`);
});

test('fitCamera never zooms out past 14, even for far points', () => {
  const camera = fitCamera([
    { latitude: 60, longitude: 22 },
    { latitude: 61, longitude: 25 },
  ]);
  assert.equal(camera.zoom, 14);
});
