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
import { createFakePayments } from './payments/fake.ts';
import { createStripePayments } from './payments/stripe.ts';
import { createFakePush } from './push/fake.ts';
import { createHub } from './realtime/hub.ts';

const config = loadConfig(process.env);
const uploadsDir = path.join(config.dataDir, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

// Stripe when there's a key (STRIPE_SECRET_KEY=sk_test_… in server/.env.local), otherwise
// pretend payments, so the app works before anyone has a Stripe account.
const payments = config.stripeSecretKey
  ? createStripePayments(config.stripeSecretKey)
  : createFakePayments();

const deps: Deps = {
  db: openDb(path.join(config.dataDir, 'shoot.db')),
  payments,
  push: createFakePush(),
  hub: createHub(),
  now: Date.now,
  uploadsDir,
  publicDir: config.publicDir,
  config,
};

// The logger prints every request ("GET /cafes 200 3ms"); the app itself stays quiet,
// so tests don't print it.
const root = new Hono();
root.use(logger());
root.route('/', createApp(deps));

/** The computer's addresses on the Wi-Fi, which a phone on the same network can reach. */
function lanAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net?.address);
}

// 0.0.0.0: listen on every network, not only this computer, so your phone can connect.
serve({ fetch: root.fetch, port: config.port, hostname: '0.0.0.0' }, () => {
  console.log(`Shoot server on http://localhost:${config.port}`);
  for (const address of lanAddresses()) {
    console.log(`  from your phone: http://${address}:${config.port}`);
  }
  console.log(`  SMS code: ${config.fixedSmsCode || 'random, printed when sent'}`);
  console.log(`  payments: ${config.stripeSecretKey ? 'Stripe' : 'fake (card 0002 declines)'}`);
  if (config.devRoutes) {
    console.log(`  seller sign-in: <café id>@shoot.test / ${SEED_SELLER_PASSWORD}`);
  }
});
