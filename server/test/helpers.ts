import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db/open.ts';
import type { Deps } from '../src/deps.ts';
import { createFakePayments } from '../src/payments/fake.ts';
import { createFakePush } from '../src/push/fake.ts';
import { createHub } from '../src/realtime/hub.ts';

/** Starts at a fixed moment, and only moves when a test says so. */
export function createClock(start = Date.parse('2026-11-17T09:00:00Z')) {
  let now = start;
  return {
    now: () => now,
    set: (ms: number) => {
      now = ms;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

/**
 * The whole server in memory: an empty database with the test cafés, a temp folder for
 * uploads, fake payments and push, and a clock the test controls. Nothing touches the network.
 */
export function createTestApp() {
  const clock = createClock();
  const payments = createFakePayments();
  const db = openDb(':memory:');
  const push = createFakePush(db);
  const hub = createHub();
  const config = loadConfig({});
  const deps: Deps = {
    db,
    payments,
    push,
    hub,
    now: clock.now,
    uploadsDir: mkdtempSync(path.join(tmpdir(), 'shoot-uploads-')),
    publicDir: config.publicDir,
    config,
  };
  return { app: createApp(deps), deps, clock, payments, push, hub };
}

type App = ReturnType<typeof createTestApp>['app'];

/** A JSON request, the way the apps send them. */
export function send(app: App, method: string, url: string, body?: unknown, token?: string) {
  return app.request(`http://test.local${url}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Signs a customer in with the development SMS code and returns their token. */
export async function signInCustomer(app: App, phone = '+358401234567'): Promise<string> {
  await send(app, 'POST', '/auth/code', { phone });
  const response = await send(app, 'POST', '/auth/verify', { phone, code: '123456' });
  const { token } = (await response.json()) as { token: string };
  return token;
}

/** Signs a seller in with a seeded development account and returns their token. */
export async function signInSeller(
  app: App,
  email = 'saaripaahtimo@shoot.test',
  password = 'shoot-demo',
): Promise<string> {
  const response = await send(app, 'POST', '/seller/auth/sign-in', { email, password });
  const { token } = (await response.json()) as { token: string };
  return token;
}
