import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { requireUser } from '../auth.ts';
import { config } from '../config.ts';
import { HttpError, readBody, Reply, reply, route } from '../http.ts';

const uploadsDir = path.join(config.dataDir, 'uploads');
mkdirSync(uploadsDir, { recursive: true });

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * Reads a file from `dir`, but only from inside it. path.basename-style checks stop a request
 * like /static/../../secret from reading files elsewhere on the computer.
 */
async function serveFrom(dir: string, relative: string) {
  const file = path.resolve(dir, relative);
  if (!file.startsWith(dir + path.sep)) {
    throw new HttpError(404, 'not_found', 'No such file.');
  }
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) {
    throw new HttpError(404, 'not_found', 'No such file.');
  }
  try {
    return new Reply(200, undefined, { body: await readFile(file), type });
  } catch {
    throw new HttpError(404, 'not_found', 'No such file.');
  }
}

/** Café and product photos that ship with the server. */
route('GET', '/static/*', (ctx) => serveFrom(config.publicDir, ctx.params['0'] ?? ''));

/**
 * Uploads one photo (the 2.4 selfie or spot photo), sent as the raw request body with
 * Content-Type image/jpeg. Returns its URL, which the app then puts in the order.
 *
 * The file name is a random UUID, so nobody can guess another user's photo address. A real
 * server would also check who may see it, and delete it after delivery as the design says.
 */
route('POST', '/uploads', async (ctx) => {
  requireUser(ctx);
  const type = ctx.req.headers['content-type'] ?? '';
  const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png' };
  // The app's dev-only sample selfie is an SVG drawing. SVG can carry scripts, so a real
  // server would never accept it from users; here it's allowed only outside production.
  if (config.devRoutes) extensions['image/svg+xml'] = '.svg';
  const extension = extensions[type];
  if (!extension) {
    throw new HttpError(415, 'unsupported_type', 'Send a JPEG or PNG photo.');
  }
  const body = await readBody(ctx.req, 10_000_000);
  if (body.length === 0) {
    throw new HttpError(400, 'empty_upload', 'The photo is empty.');
  }

  const name = `${randomUUID()}${extension}`;
  await writeFile(path.join(uploadsDir, name), body);
  return reply(201, { url: `${ctx.origin}/uploads/${name}`, path: `/uploads/${name}` });
});

route('GET', '/uploads/:name', (ctx) => serveFrom(uploadsDir, ctx.params.name));
