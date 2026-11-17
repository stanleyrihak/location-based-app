import type { Context } from 'hono';

import { HttpError } from './errors.ts';

/** Reads a JSON body as an object. Each route then checks the fields it needs. */
export async function readJson(c: Context): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    const text = await c.req.text();
    value = JSON.parse(text || '{}');
  } catch {
    value = null;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new HttpError(400, 'bad_json', 'The body must be a JSON object.');
}

/**
 * "http://192.168.1.20:4000": the address the phone used, for building image URLs.
 *
 * Behind the HTTPS tunnel (ngrok) the request reaches the laptop as plain http on localhost.
 * The tunnel says what the phone really used in X-Forwarded-Proto and X-Forwarded-Host, and
 * image addresses must use that: a Release build on the iPhone refuses plain http.
 */
export function originOf(c: Context): string {
  const url = new URL(c.req.url);
  const proto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = c.req.header('x-forwarded-host')?.split(',')[0]?.trim();
  return `${proto || url.protocol.replace(':', '')}://${host || url.host}`;
}

/** The token from "Authorization: Bearer <token>", or an empty string. */
export function bearerToken(c: Context): string {
  const header = c.req.header('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
}
