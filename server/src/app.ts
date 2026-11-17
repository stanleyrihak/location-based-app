import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Deps } from './deps.ts';
import { HttpError } from './errors.ts';
import { authRoutes } from './routes/auth.ts';
import { cafeRoutes } from './routes/cafes.ts';
import { devRoutes } from './routes/dev.ts';
import { fileRoutes } from './routes/files.ts';
import { sellerAuthRoutes } from './routes/seller-auth.ts';

/**
 * The whole HTTP API, built from what's passed in. Nothing here opens a database or a port:
 * main.ts does that for the real server, and tests call `app.request()` without a network.
 */
export function createApp(deps: Deps) {
  const app = new Hono();

  // CORS lets a web page on another address call this API. Native apps don't need it.
  app.use(cors());

  app.route('/', authRoutes(deps));
  app.route('/', cafeRoutes(deps));
  app.route('/', fileRoutes(deps));
  app.route('/', sellerAuthRoutes(deps));
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

  return app;
}
