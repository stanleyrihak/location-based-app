import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';

import { ApiError, createApiClient } from '../src/api-client.ts';

let baseUrl = '';
let lastAuthorization: string | undefined;

// A tiny server that answers by path, so each test can ask for the case it needs.
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  lastAuthorization = req.headers.authorization;
  if (req.url === '/ok') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"hello":"world"}');
  } else if (req.url === '/empty') {
    res.writeHead(204).end();
  } else if (req.url === '/unauthorized') {
    res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"unauthorized"}');
  } else {
    res
      .writeHead(409, { 'Content-Type': 'application/json' })
      .end('{"error":"sold_out","message":"Gone.","itemIds":["a"]}');
  }
});

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

function client(onUnauthorized = () => {}) {
  return createApiClient({ baseUrl, getToken: () => 'secret-token', onUnauthorized });
}

test('sends the bearer token', async () => {
  assert.deepEqual(await client().request('/ok'), { hello: 'world' });
  assert.equal(lastAuthorization, 'Bearer secret-token');
});

test('204 resolves to undefined', async () => {
  assert.equal(await client().request('/empty', { method: 'POST' }), undefined);
});

test('401 calls onUnauthorized and throws ApiError 401', async () => {
  let called = 0;
  await assert.rejects(
    client(() => called++).request('/unauthorized'),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(called, 1);
});

test('error body becomes code, message and details', async () => {
  await assert.rejects(client().request('/other'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.deepEqual(
      [error.status, error.code, error.message, error.details],
      [409, 'sold_out', 'Gone.', { itemIds: ['a'] }],
    );
    return true;
  });
});

test('unreachable server throws status 0 code network', async () => {
  const offline = createApiClient({
    baseUrl: 'http://127.0.0.1:9',
    getToken: () => null,
    onUnauthorized: () => {},
  });
  await assert.rejects(
    offline.request('/ok'),
    (error: unknown) => error instanceof ApiError && error.status === 0 && error.code === 'network',
  );
});
