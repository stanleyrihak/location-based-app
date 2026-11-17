import type { DatabaseSync } from 'node:sqlite';

import type { Config } from './config.ts';
import type { Payments } from './payments/types.ts';
import type { Push } from './push/types.ts';
import type { Hub } from './realtime/hub.ts';

/**
 * Everything with a side effect, passed into the app instead of imported. main.ts passes the
 * real ones; tests pass an in-memory database, fakes and a clock they control.
 */
export type Deps = {
  db: DatabaseSync;
  payments: Payments;
  push: Push;
  hub: Hub;
  /** The current time in ms. Always use this, never Date.now(), so tests can move time. */
  now: () => number;
  uploadsDir: string;
  publicDir: string;
  config: Config;
};
