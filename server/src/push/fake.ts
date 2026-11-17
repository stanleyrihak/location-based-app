import type { DatabaseSync } from 'node:sqlite';

import { createPushService, type Outgoing } from './service.ts';

/** Push without the network: every notification lands in `sent`, for tests to check. */
export function createFakePush(db: DatabaseSync) {
  const sent: Outgoing[] = [];
  const service = createPushService(db, async (messages) => {
    sent.push(...messages);
  });
  return { ...service, sent };
}
