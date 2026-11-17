import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { createLiveConnection, type LiveSocket, SILENCE_MS } from '../src/live-connection.ts';
import type { Order } from '../src/types.ts';

type FakeSocket = LiveSocket & { closed: boolean };

/** A controller over fake sockets, with a record of what it reported. */
function setUp() {
  mock.timers.enable({ apis: ['setTimeout'] });
  const sockets: FakeSocket[] = [];
  const connected: boolean[] = [];
  const orders: Order[] = [];
  let opened = 0;
  let unauthorized = 0;
  const live = createLiveConnection({
    open: () => {
      const socket: FakeSocket = {
        onopen: null,
        onmessage: null,
        onclose: null,
        closed: false,
        close() {
          this.closed = true;
        },
      };
      sockets.push(socket);
      return socket;
    },
    onOpen: () => {
      opened += 1;
    },
    onOrder: (order) => orders.push(order),
    onConnectedChange: (value) => connected.push(value),
    onUnauthorized: () => {
      unauthorized += 1;
    },
  });
  return {
    live,
    sockets,
    connected,
    orders,
    opened: () => opened,
    unauthorized: () => unauthorized,
    done: () => {
      live.stop();
      mock.timers.reset();
    },
  };
}

test('reconnects after 1 s when the connection drops', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onopen?.();
  t.sockets[0].onclose?.({ code: 1006 });
  mock.timers.tick(999);
  assert.equal(t.sockets.length, 1);
  mock.timers.tick(1);
  assert.equal(t.sockets.length, 2);
  t.done();
});

test('a socket closed on purpose (app in the background) does not reconnect', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onopen?.();
  t.live.pause();
  assert.equal(t.sockets[0].closed, true);
  // The close event arrives a moment later, as on a real socket.
  t.sockets[0].onclose?.({ code: 1000 });
  mock.timers.tick(60_000);
  assert.equal(t.sockets.length, 1);
  assert.equal(t.connected.at(-1), false);
  t.done();
});

test('a late close of a replaced socket leaves the new one connected', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onopen?.();
  t.live.pause();
  t.live.start();
  t.sockets[1].onopen?.();
  t.sockets[0].onclose?.({ code: 1000 });
  assert.equal(t.connected.at(-1), true);
  mock.timers.tick(60_000);
  assert.equal(t.sockets.length, 2);
  t.done();
});

test('silence for 45 s closes the socket and reconnects', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onopen?.();
  mock.timers.tick(SILENCE_MS);
  assert.equal(t.sockets[0].closed, true);
  assert.equal(t.connected.at(-1), false);
  mock.timers.tick(1000);
  assert.equal(t.sockets.length, 2);
  t.done();
});

test('any message, a ping too, restarts the silence timer', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onopen?.();
  mock.timers.tick(SILENCE_MS - 5000);
  t.sockets[0].onmessage?.({ data: JSON.stringify({ type: 'ping' }) });
  mock.timers.tick(SILENCE_MS - 5000);
  assert.equal(t.sockets[0].closed, false);
  assert.deepEqual(t.orders, []);
  t.done();
});

test('passes on orders and refetches on every open', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onopen?.();
  const order = { id: 'a' } as Order;
  t.sockets[0].onmessage?.({ data: JSON.stringify({ type: 'order.updated', order }) });
  t.sockets[0].onmessage?.({ data: 'not json' });
  assert.deepEqual(t.orders, [order]);
  assert.equal(t.opened(), 1);
  t.done();
});

test('4401 (bad token) reports it and does not retry', () => {
  const t = setUp();
  t.live.start();
  t.sockets[0].onclose?.({ code: 4401 });
  mock.timers.tick(60_000);
  assert.equal(t.sockets.length, 1);
  assert.equal(t.unauthorized(), 1);
  t.done();
});

test('passes on position messages, not as orders', () => {
  const positions: unknown[] = [];
  mock.timers.enable({ apis: ['setTimeout'] });
  const sockets: LiveSocket[] = [];
  const live = createLiveConnection({
    open: () => {
      const socket: LiveSocket = { onopen: null, onmessage: null, onclose: null, close() {} };
      sockets.push(socket);
      return socket;
    },
    onOpen: () => {},
    onOrder: () => assert.fail('not an order'),
    onConnectedChange: () => {},
    onPosition: (message) => positions.push(message),
  });
  live.start();
  sockets[0].onopen?.();
  const message = {
    type: 'seller.position',
    orderId: 'a',
    position: { latitude: 60.45, longitude: 22.27, at: '2026-11-17T09:00:00Z' },
  };
  sockets[0].onmessage?.({ data: JSON.stringify(message) });
  assert.deepEqual(positions, [message]);
  live.stop();
  mock.timers.reset();
});
