import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceInMetres, movedFromSpot } from '../src/geo.ts';

const SPOT = { latitude: 60.45, longitude: 22.27 };
/** About `metres` north of the spot (1° of latitude ≈ 111.2 km). */
const north = (metres: number) => ({
  latitude: SPOT.latitude + metres / 111_195,
  longitude: SPOT.longitude,
});
const order = (status = 'preparing') => ({ id: 'a', status, deliverTo: SPOT }) as never;
const none = new Set<string>();

test('distanceInMetres is about 111 km per degree of latitude', () => {
  const metres = distanceInMetres(SPOT, { latitude: 61.45, longitude: 22.27 });
  assert.ok(Math.abs(metres - 111_195) < 50, `${metres}`);
});

test('movedFromSpot is true 50 m away', () => {
  assert.equal(movedFromSpot(order(), north(50), none), true);
});

test('movedFromSpot is false 20 m away', () => {
  assert.equal(movedFromSpot(order(), north(20), none), false);
});

test('movedFromSpot is false for a delivered order', () => {
  assert.equal(movedFromSpot(order('delivered'), north(50), none), false);
});

test('movedFromSpot is false for a dismissed order', () => {
  assert.equal(movedFromSpot(order(), north(50), new Set(['a'])), false);
});

test('movedFromSpot is false when the fix’s accuracy could explain the distance', () => {
  assert.equal(movedFromSpot(order(), { ...north(50), accuracy: 40 }, none), false);
  assert.equal(movedFromSpot(order(), { ...north(50), accuracy: 15 }, none), true);
});

test('movedFromSpot is false for an invalid fix (iOS reports a negative accuracy)', () => {
  assert.equal(movedFromSpot(order(), { ...north(50), accuracy: -1 }, none), false);
});
