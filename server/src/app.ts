import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Deps } from './deps.ts';
import { HttpError } from './errors.ts';
import { authRoutes } from './routes/auth.ts';
import { cafeRoutes } from './routes/cafes.ts';
import { devRoutes } from './routes/dev.ts';
import { fileRoutes } from './routes/files.ts';
import { liveRoutes } from './routes/live.ts';
import { orderRoutes } from './routes/orders.ts';
import { sellerAuthRoutes } from './routes/seller-auth.ts';
import { sellerCafeRoutes } from './routes/seller-cafe.ts';
import { sellerOrderRoutes } from './routes/seller-orders.ts';

/**
 * The whole HTTP API, built from what's passed in. Nothing here opens a database or a port:
 * main.ts does that for the real server, and tests call `app.request()` without a network.
 */
export function createApp(deps: Deps) {
  const app = new Hono();
  // WebSockets need the HTTP server itself, which only exists once something calls serve().
  // So the app carries `injectWebSocket(server)` for main.ts (and tests) to call after that.
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  // CORS lets a web page on another address call this API. Native apps don't need it.
  app.use(cors());

  /**
   * How payments work, for the app before it pays: Stripe (with the publishable key for its
   * payment sheet) or the fake payments. No sign-in needed: nothing here is secret.
   */
  app.get('/config', (c) =>
    c.json({
      payments: deps.config.stripeSecretKey ? 'stripe' : 'fake',
      stripePublishableKey: deps.config.stripeSecretKey
        ? (deps.config.stripePublishableKey ?? null)
        : null,
    }),
  );

  app.route('/', authRoutes(deps));
  app.route('/', cafeRoutes(deps));
  app.route('/', fileRoutes(deps));
  app.route('/', orderRoutes(deps));
  app.route('/', sellerAuthRoutes(deps));
  app.route('/', sellerOrderRoutes(deps));
  app.route('/', sellerCafeRoutes(deps));
  app.route('/', liveRoutes(deps, upgradeWebSocket));
  if (deps.config.devRoutes) {
    app.route('/', devRoutes(deps));
  }

  app.notFound((c) =>
    c.json({ error: 'not_found', message: `Nothing at ${new URL(c.req.url).pathname}.` }, 404),
  );

  // Every error becomes JSON the apps understand: { error, message, ...details }.
  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json(
        { error: error.code, message: error.message, ...error.details },
        error.status as 400,
      );
    }
    console.error(error);
    return c.json({ error: 'server_error', message: 'Something went wrong on the server.' }, 500);
  });

  return Object.assign(app, { injectWebSocket });
}
