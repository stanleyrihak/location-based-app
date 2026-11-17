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

/** "http://192.168.1.20:4000": the address the phone used, for building image URLs. */
export function originOf(c: Context): string {
  return new URL(c.req.url).origin;
}

/** The token from "Authorization: Bearer <token>", or an empty string. */
export function bearerToken(c: Context): string {
  const header = c.req.header('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
}
