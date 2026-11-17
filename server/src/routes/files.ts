import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import { requireUser } from '../auth/sessions.ts';
import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { originOf } from '../request.ts';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const MAX_UPLOAD_BYTES = 10_000_000;

/**
 * Reads a file from `dir`, but only from inside it: path.resolve plus the prefix check stops
 * a request like /static/../../secret from reading files elsewhere on the computer.
 */
async function serveFrom(dir: string, relative: string) {
  const root = path.resolve(dir);
  const file = path.resolve(root, relative);
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!file.startsWith(root + path.sep) || !type) {
    throw new HttpError(404, 'not_found', 'No such file.');
  }
  try {
    return { body: await readFile(file), type };
  } catch {
    throw new HttpError(404, 'not_found', 'No such file.');
  }
}

/** Photos: the café and menu pictures that ship with the server, and customers' uploads. */
export function fileRoutes(deps: Deps) {
  const app = new Hono();

  app.get('/static/*', async (c) => {
    const relative = decodeURIComponent(new URL(c.req.url).pathname.slice('/static/'.length));
    const { body, type } = await serveFrom(deps.publicDir, relative);
    return c.body(new Uint8Array(body), 200, {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=3600',
    });
  });

  /**
   * Uploads one photo (the 2.4 selfie or spot photo), sent as the raw request body with
   * Content-Type image/jpeg. Returns its URL and path; the app puts the path in the order.
   *
   * The file name is a random UUID, so nobody can guess another user's photo address.
   * The order deletes its photos when it ends.
   */
  app.post(
    '/uploads',
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: () => {
        throw new HttpError(413, 'too_large', 'The photo is larger than 10 MB.');
      },
    }),
    async (c) => {
      requireUser(c, deps);
      const type = c.req.header('content-type') ?? '';
      const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png' };
      // The app's dev-only sample selfie is an SVG drawing. SVG can carry scripts, so a real
      // server would never accept it from users; here it's allowed only outside production.
      if (deps.config.devRoutes) extensions['image/svg+xml'] = '.svg';
      const extension = extensions[type];
      if (!extension) {
        throw new HttpError(415, 'unsupported_type', 'Send a JPEG or PNG photo.');
      }
      const body = new Uint8Array(await c.req.arrayBuffer());
      if (body.length === 0) {
        throw new HttpError(400, 'empty_upload', 'The photo is empty.');
      }

      const name = `${randomUUID()}${extension}`;
      await writeFile(path.join(deps.uploadsDir, name), body);
      return c.json({ url: `${originOf(c)}/uploads/${name}`, path: `/uploads/${name}` }, 201);
    },
  );

  app.get('/uploads/:name', async (c) => {
    const { body, type } = await serveFrom(deps.uploadsDir, c.req.param('name'));
    return c.body(new Uint8Array(body), 200, { 'Content-Type': type });
  });

  return app;
}
