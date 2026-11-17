import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryClient } from '@tanstack/query-core';

import { writeLiveOrder } from '../src/live.ts';
import type { Order } from '../src/types.ts';

function order(id: string, createdAt: string): Order {
  return { id, createdAt, updatedAt: createdAt, status: 'received' } as unknown as Order;
}

const KEY = ['seller-queue'];
const OLD = order('a', '2026-11-17T09:00:00Z');
const NEW = order('b', '2026-11-17T09:05:00Z');

test('a fetch that started before a live order does not remove it', async () => {
  const client = new QueryClient();
  client.setQueryData(KEY, [OLD]);

  // The first fetch answers with the list from before the new order; a second one includes it.
  let calls = 0;
  let answerOld: (orders: Order[]) => void = () => {};
  const queryFn = () => {
    calls += 1;
    if (calls === 1) return new Promise<Order[]>((resolve) => (answerOld = resolve));
    return Promise.resolve([NEW, OLD]);
  };
  const first = client.fetchQuery({ queryKey: KEY, queryFn, staleTime: 0 }).catch(() => {});

  const previous = writeLiveOrder(client, KEY, NEW);
  answerOld([OLD]);
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(previous, undefined);
  assert.deepEqual(
    client.getQueryData<Order[]>(KEY)?.map((o) => o.id),
    ['b', 'a'],
  );
});

test('returns the cached copy from before the update', () => {
  const client = new QueryClient();
  client.setQueryData(KEY, [OLD]);
  const newer = { ...OLD, status: 'preparing', updatedAt: '2026-11-17T09:01:00Z' } as Order;
  assert.equal(writeLiveOrder(client, KEY, newer), OLD);
  assert.equal(client.getQueryData<Order[]>(KEY)?.[0].status, 'preparing');
});
