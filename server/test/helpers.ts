import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { serve } from '@hono/node-server';

import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db/open.ts';
import type { Deps } from '../src/deps.ts';
import { createFakePayments } from '../src/payments/fake.ts';
import { createHub } from '../src/realtime/hub.ts';
import { createTracker } from '../src/realtime/tracker.ts';

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
 * uploads, fake payments, and a clock the test controls. Nothing touches the network.
 */
/** `env` sets configuration (like STRIPE_PUBLISHABLE_KEY); payments stay fake either way. */
export function createTestApp(env: Record<string, string> = {}) {
  const clock = createClock();
  const payments = createFakePayments();
  const db = openDb(':memory:');
  const hub = createHub();
  const config = loadConfig(env);
  const deps: Deps = {
    db,
    payments,
    hub,
    tracker: createTracker(),
    now: clock.now,
    uploadsDir: mkdtempSync(path.join(tmpdir(), 'shoot-uploads-')),
    publicDir: config.publicDir,
    config,
  };
  return { app: createApp(deps), deps, clock, payments, hub };
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

/** Where the tests stand: the cafés are placed around this point. */
export const HERE = { latitude: 60.45, longitude: 22.27 };

/** A live-connection message, as the tests read it. */
export type Message = {
  type: string;
  order: { id: string; status: string };
  [key: string]: unknown;
};

/** The test app on a real port, so a real WebSocket can connect. */
export async function startLive() {
  const t = createTestApp();
  const server = serve({ fetch: t.app.fetch, port: 0, hostname: '127.0.0.1' });
  t.app.injectWebSocket(server);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  await send(t.app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  return {
    ...t,
    url: `ws://127.0.0.1:${port}/ws`,
    /** Closes the sockets the test opened first, so a failed assertion can't hang the run. */
    close: () => {
      for (const socket of openSockets) socket.close();
      openSockets.clear();
      return new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

const openSockets = new Set<WebSocket>();

/** Opens a socket and collects every message it gets. */
export async function connect(url: string, token: string) {
  const socket = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
  openSockets.add(socket);
  const messages: Message[] = [];
  socket.addEventListener('message', (event) => messages.push(JSON.parse(String(event.data))));
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return { socket, messages };
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
