import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';

import { serve } from '@hono/node-server';

import { createHub } from '../src/realtime/hub.ts';
import { createTestApp, send, signInCustomer, signInSeller } from './helpers.ts';

const HERE = { latitude: 60.45, longitude: 22.27 };
const NEW_ORDER = {
  cafeId: 'saaripaahtimo',
  lines: [{ itemId: 'saari-cappuccino', quantity: 1 }],
  note: '',
  coordinates: HERE,
  delivery: { kind: 'spot', spotCode: 'shoot-spot:saari-table-4' },
  payment: { methodId: 'wallet', label: 'Apple Pay' },
};

type Message = { type: string; order: { id: string; status: string } };

/** The test app on a real port, so a real WebSocket can connect. */
async function start() {
  const t = createTestApp();
  const server = serve({ fetch: t.app.fetch, port: 0, hostname: '127.0.0.1' });
  t.app.injectWebSocket(server);
  await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  const { port } = server.address() as AddressInfo;
  await send(t.app, 'GET', `/cafes?latitude=${HERE.latitude}&longitude=${HERE.longitude}`);
  return {
    ...t,
    url: `ws://127.0.0.1:${port}/ws`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** Opens a socket and collects every message it gets. */
async function connect(url: string, token: string) {
  const socket = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
  const messages: Message[] = [];
  socket.addEventListener('message', (event) => messages.push(JSON.parse(String(event.data))));
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return { socket, messages };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function placePaidOrder(app: ReturnType<typeof createTestApp>['app'], token: string) {
  const created = await send(app, 'POST', '/orders', NEW_ORDER, token);
  const { order } = (await created.json()) as { order: { id: string } };
  await send(app, 'POST', `/orders/${order.id}/confirm`, undefined, token);
  return order.id;
}

test('customer and the café receive the order’s updates; another customer receives nothing', async () => {
  const s = await start();
  try {
    const customer = await signInCustomer(s.app);
    const stranger = await signInCustomer(s.app, '+358409999999');
    const seller = await signInSeller(s.app);
    const mine = await connect(s.url, customer);
    const theirs = await connect(s.url, stranger);
    const cafe = await connect(s.url, seller);

    const orderId = await placePaidOrder(s.app, customer);
    await send(s.app, 'POST', `/seller/orders/${orderId}/accept`, undefined, seller);
    await wait(200);

    // The unpaid draft is never broadcast: the café only hears about paid orders.
    assert.deepEqual(
      mine.messages.map((m) => [m.type, m.order.id, m.order.status]),
      [
        ['order.updated', orderId, 'received'],
        ['order.updated', orderId, 'preparing'],
      ],
    );
    assert.deepEqual(
      cafe.messages.map((m) => m.order.status),
      ['received', 'preparing'],
    );
    assert.equal(theirs.messages.length, 0);

    for (const { socket } of [mine, theirs, cafe]) socket.close();
  } finally {
    await s.close();
  }
});

test('another café’s seller receives nothing', async () => {
  const s = await start();
  try {
    const customer = await signInCustomer(s.app);
    const other = await connect(s.url, await signInSeller(s.app, 'kampuskuppi@shoot.test'));
    await placePaidOrder(s.app, customer);
    await wait(200);
    assert.equal(other.messages.length, 0);
    other.socket.close();
  } finally {
    await s.close();
  }
});

test('a bad token is closed with 4401', async () => {
  const s = await start();
  try {
    const socket = new WebSocket(`${s.url}?token=nope`);
    const code = await new Promise<number>((resolve) =>
      socket.addEventListener('close', (event) => resolve(event.code), { once: true }),
    );
    assert.equal(code, 4401);
  } finally {
    await s.close();
  }
});

test('ping sends a small message to every open connection, so phones can tell it is alive', () => {
  const hub = createHub();
  const got: string[] = [];
  const detach = hub.attach({ send: (text) => got.push(text) }, { cafeId: 'saaripaahtimo' }, '');
  hub.attach({ send: (text) => got.push(text) }, { userId: 'u1' }, '');
  detach();
  hub.ping();
  assert.deepEqual(got, ['{"type":"ping"}']);
});
