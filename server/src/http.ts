import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * A tiny router on top of Node's own http module, instead of a framework like Express or
 * Hono. It's about 100 lines, so you can read all of it: match the method and path, run the
 * handler, turn what it returns (or throws) into a JSON response.
 */

/** Thrown by handlers. `code` is for the app's code, `message` is for people. */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type Context = {
  req: IncomingMessage;
  url: URL;
  /** The `:name` parts of the path. */
  params: Record<string, string>;
  /** "http://192.168.1.20:4000": the address the phone used, for building image URLs. */
  origin: string;
};

/**
 * A handler returns data (sent as JSON with 200), a Reply for another status code or a file,
 * or nothing (204). Reply is a class, so `instanceof` can tell it apart from data: an order
 * also has a `status` field, but it's not an HTTP status.
 */
export class Reply {
  status: number;
  json?: unknown;
  raw?: { body: Buffer; type: string };

  constructor(status: number, json?: unknown, raw?: { body: Buffer; type: string }) {
    this.status = status;
    this.json = json;
    this.raw = raw;
  }
}

type Handler = (ctx: Context) => Promise<unknown> | unknown;

type Route = { method: string; pattern: URLPattern; handler: Handler };
const routes: Route[] = [];

/** Registers a route: `route('GET', '/cafes/:id/menu', handler)`. */
export function route(method: string, pathname: string, handler: Handler) {
  routes.push({ method, pattern: new URLPattern({ pathname }), handler });
}

export function reply(status: number, json?: unknown): Reply {
  return new Reply(status, json);
}

function send(res: ServerResponse, status: number, json?: unknown) {
  if (json === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(json));
}

/** The function Node's http server calls for every request. */
export async function handle(req: IncomingMessage, res: ServerResponse) {
  // CORS: lets a web page on another address (the café dashboard, Expo web) call this API.
  // Native apps don't need it; browsers do.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Staff-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    send(res, 204);
    return;
  }

  const origin = `http://${req.headers.host ?? 'localhost'}`;
  const url = new URL(req.url ?? '/', origin);
  const started = Date.now();

  try {
    const result = await dispatch(req, url, origin);
    if (result === undefined) {
      send(res, 204);
    } else if (result instanceof Reply && result.raw) {
      res.writeHead(result.status, {
        'Content-Type': result.raw.type,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(result.raw.body);
    } else if (result instanceof Reply) {
      send(res, result.status, result.json);
    } else {
      send(res, 200, result);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      send(res, error.status, { error: error.code, message: error.message, ...error.details });
    } else {
      console.error(error);
      send(res, 500, { error: 'server_error', message: 'Something went wrong on the server.' });
    }
  } finally {
    console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started} ms`);
  }
}

async function dispatch(req: IncomingMessage, url: URL, origin: string) {
  let pathMatched = false;
  for (const { method, pattern, handler } of routes) {
    const match = pattern.exec({ pathname: url.pathname });
    if (!match) continue;
    pathMatched = true;
    if (method !== req.method) continue;

    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(match.pathname.groups)) {
      if (value !== undefined) params[key] = decodeURIComponent(value);
    }
    return handler({ req, url, params, origin });
  }
  throw pathMatched
    ? new HttpError(405, 'method_not_allowed', `${req.method} isn't allowed here.`)
    : new HttpError(404, 'not_found', `Nothing at ${url.pathname}.`);
}

/** Reads the whole request body, up to `limit` bytes. */
export async function readBody(req: IncomingMessage, limit = 1_000_000): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      throw new HttpError(413, 'too_large', `The request is larger than ${limit} bytes.`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Reads a JSON body as an object. Each route then checks the fields it needs. */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const text = (await readBody(req)).toString('utf8');
  try {
    const value: unknown = JSON.parse(text || '{}');
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  } catch {
    // Falls through to the error below.
  }
  throw new HttpError(400, 'bad_json', 'The body must be a JSON object.');
}
