import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { randomUUID } from 'node:crypto';

import { hashPasswordSync } from '../auth/passwords.ts';
import { SCHEMA } from './schema.ts';
import { SEED_CAFES, SEED_MENU, SEED_SPOTS, SEED_SELLER_PASSWORD } from './seed.ts';

// Hashing on purpose takes a moment, and tests open a fresh database each time. The seeded
// development accounts share one hash, made once per run. Real accounts get their own salt.
let seedPasswordHash: string | undefined;

/**
 * Opens (or creates) the database and fills an empty one with the test cafés.
 * `':memory:'` gives a fresh database that disappears when the process ends: what tests use.
 *
 * Node's built-in SQLite driver is synchronous: each query finishes before the next line
 * runs. Node handles one request at a time between `await`s, so two writes never interleave.
 */
export function openDb(file: string): DatabaseSync {
  if (file !== ':memory:') {
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  seed(db);
  return db;
}

/** Runs once, on an empty database. Later starts keep your changes. */
function seed(db: DatabaseSync) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM cafes').get() as { count: number };
  if (count > 0) return;

  const insertCafe = db.prepare(`
    INSERT INTO cafes (id, name, image, cover_image, north_m, east_m, radius_m, open_until,
      ready_in_min, delivery_fee_cents, categories)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO menu_items (id, cafe_id, position, name, description, price_cents, image,
      section, sold_out)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSpot = db.prepare('INSERT INTO spots (id, cafe_id, label, code) VALUES (?, ?, ?, ?)');

  db.exec('BEGIN');
  for (const cafe of SEED_CAFES) {
    insertCafe.run(
      cafe.id,
      cafe.name,
      cafe.image,
      cafe.coverImage,
      cafe.offset.northM,
      cafe.offset.eastM,
      cafe.radiusM,
      cafe.openUntil,
      cafe.readyInMin,
      cafe.deliveryFeeCents,
      JSON.stringify(cafe.categories),
    );
  }
  SEED_MENU.forEach((item, position) => {
    insertItem.run(
      item.id,
      item.cafeId,
      position,
      item.name,
      item.description,
      item.priceCents,
      item.image ?? null,
      item.section,
      item.soldOut ? 1 : 0,
    );
  });
  for (const spot of SEED_SPOTS) {
    insertSpot.run(spot.id, spot.cafeId, spot.label, spot.code);
  }

  // One seller per café: "<café id>@shoot.test", password SEED_SELLER_PASSWORD.
  seedPasswordHash ??= hashPasswordSync(SEED_SELLER_PASSWORD);
  const insertStaff = db.prepare(
    'INSERT INTO staff (id, cafe_id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const cafe of SEED_CAFES) {
    insertStaff.run(
      randomUUID(),
      cafe.id,
      `${cafe.id}@shoot.test`,
      `${cafe.name} seller`,
      seedPasswordHash,
      new Date().toISOString(),
    );
  }
  db.exec('COMMIT');
}
