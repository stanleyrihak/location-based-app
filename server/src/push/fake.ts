import type { Push } from './types.ts';

/** Remembers what would have been sent, for tests. Filled in by Task 8 of the server plan. */
export function createFakePush() {
  const sent: { token: string; title: string; body: string }[] = [];
  const push: Push = {
    orderChanged() {},
  };
  return { ...push, sent };
}
