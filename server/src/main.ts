import { mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { openDb } from './db/open.ts';
import { SEED_SELLER_PASSWORD } from './db/seed.ts';
import type { Deps } from './deps.ts';
import { abandonUnpaid, expireOverdue } from './domain/orders.ts';
import { createFakePayments } from './payments/fake.ts';
import { createStripePayments } from './payments/stripe.ts';
import { createHub } from './realtime/hub.ts';
import { createTracker } from './realtime/tracker.ts';

const config = loadConfig(process.env);
const uploadsDir = path.join(config.dataDir, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

// Stripe when there's a key (STRIPE_SECRET_KEY=sk_test_… in server/.env.local), otherwise
// pretend payments, so the app works before anyone has a Stripe account.
const payments = config.stripeSecretKey
  ? createStripePayments(config.stripeSecretKey)
  : createFakePayments();

const db = openDb(path.join(config.dataDir, 'shoot.db'));
const deps: Deps = {
  db,
  payments,
  hub: createHub(),
  tracker: createTracker(),
  now: Date.now,
  uploadsDir,
  publicDir: config.publicDir,
  config,
};

// The logger prints every request ("GET /cafes 200 3ms"); the app itself stays quiet,
// so tests don't print it.
const app = createApp(deps);
const root = new Hono();
root.use(logger());
root.route('/', app);

/** The computer's addresses on the Wi-Fi, which a phone on the same network can reach. */
function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net?.address);
}

// 0.0.0.0: listen on every network, not only this computer, so your phone can connect.
const server = serve({ fetch: root.fetch, port: config.port, hostname: '0.0.0.0' }, () => {
  console.log(`Shoot server on http://localhost:${config.port}`);
  for (const address of lanAddresses()) {
    console.log(`  from your phone: http://${address}:${config.port}`);
  }
  console.log(`  SMS code: ${config.fixedSmsCode || 'random, printed when sent'}`);
  console.log(`  payments: ${config.stripeSecretKey ? 'Stripe' : 'fake (card 0002 declines)'}`);
  if (config.stripeSecretKey && !config.stripePublishableKey) {
    console.log('  ! STRIPE_PUBLISHABLE_KEY is missing: the app can’t show the payment sheet.');
  }
  if (config.devRoutes) {
    console.log(`  seller sign-in: seller@shoot.com / ${SEED_SELLER_PASSWORD} (also seller2@, seller3@)`);
  }
});
app.injectWebSocket(server);

// The timer: every 15 seconds, end paid orders the café didn't accept within 5 minutes
// (the money is released), and drop orders that were started but never paid.
// An accept that arrives late is refused even between two runs (acceptOrder checks the time).
const TIMER_MS = 15_000;
setInterval(() => {
  Promise.all([expireOverdue(deps), abandonUnpaid(deps)]).catch((error: unknown) => {
    console.error('The order timer failed', error);
  });
}, TIMER_MS);

// Every 20 seconds, a ping on every live connection: the apps reconnect if it stops coming.
setInterval(() => deps.hub.ping(), 20_000);
