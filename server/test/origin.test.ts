import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTestApp } from './helpers.ts';

test('behind the HTTPS tunnel, image addresses use the public https address', async () => {
  const { app } = createTestApp();
  const response = await app.request('http://localhost:4000/cafes/saaripaahtimo', {
    headers: {
      host: 'chance-clean-petted.ngrok-free.dev',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'chance-clean-petted.ngrok-free.dev',
    },
  });
  const cafe = (await response.json()) as { image: string };
  assert.ok(
    cafe.image.startsWith('https://chance-clean-petted.ngrok-free.dev/static/'),
    cafe.image,
  );
});

test('on the Wi-Fi, without a tunnel, they stay as the phone asked', async () => {
  const { app } = createTestApp();
  const response = await app.request('http://192.168.1.20:4000/cafes/saaripaahtimo');
  const cafe = (await response.json()) as { image: string };
  assert.ok(cafe.image.startsWith('http://192.168.1.20:4000/static/'), cafe.image);
});
