import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { config } from './config.ts';
import { SEED_CAFES, SEED_MENU, SEED_SPOTS } from './seed.ts';

mkdirSync(config.dataDir, { recursive: true });

/**
 * One SQLite file, opened with Node's built-in driver. It's synchronous: each query finishes
 * before the next line runs. Node handles one request at a time between `await`s, so two
 * orders can never get the same number.
 */
export const db = new DatabaseSync(path.join(config.dataDir, 'shoot.db'));

db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    phone       TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL
  );

  -- A signed-in phone. The token is the password for every request after sign-in.
  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL
  );

  -- The last SMS code sent to each number.
  CREATE TABLE IF NOT EXISTS login_codes (
    phone       TEXT PRIMARY KEY,
    code        TEXT NOT NULL,
    expires_at  INTEGER NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cafes (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    image               TEXT NOT NULL,
    cover_image         TEXT NOT NULL,
    -- Test data: where the café sits relative to the first user, in metres.
    north_m             REAL NOT NULL,
    east_m              REAL NOT NULL,
    latitude            REAL,
    longitude           REAL,
    radius_m            INTEGER NOT NULL,
    open_until          TEXT NOT NULL,
    is_open             INTEGER NOT NULL DEFAULT 1,
    ready_in_min        INTEGER NOT NULL,
    delivery_fee_cents  INTEGER NOT NULL,
    categories          TEXT NOT NULL  -- JSON list
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id           TEXT PRIMARY KEY,
    cafe_id      TEXT NOT NULL REFERENCES cafes(id),
    position     INTEGER NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL,
    price_cents  INTEGER NOT NULL,
    image        TEXT,
    section      TEXT NOT NULL,
    sold_out     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS spots (
    id       TEXT PRIMARY KEY,
    cafe_id  TEXT NOT NULL REFERENCES cafes(id),
    label    TEXT NOT NULL,
    code     TEXT NOT NULL UNIQUE
  );

  -- Lines and delivery are stored as JSON copies, as they were when the order was placed.
  -- A bigger system would give the lines their own table, for reports like "cappuccinos sold".
  CREATE TABLE IF NOT EXISTS orders (
    id                  TEXT PRIMARY KEY,
    number              INTEGER NOT NULL UNIQUE,
    user_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
    cafe_id             TEXT NOT NULL REFERENCES cafes(id),
    cafe_name           TEXT NOT NULL,
    cafe_image          TEXT NOT NULL,
    lines               TEXT NOT NULL,
    note                TEXT NOT NULL,
    subtotal_cents      INTEGER NOT NULL,
    delivery_fee_cents  INTEGER NOT NULL,
    total_cents         INTEGER NOT NULL,
    delivery            TEXT NOT NULL,
    payment_label       TEXT NOT NULL,
    status              TEXT NOT NULL,
    -- 1 while the clock moves the status (AUTO_ADVANCE); 0 once staff change it by hand.
    auto_status         INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL,
    ready_at            TEXT NOT NULL,
    updated_at          TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS orders_by_user ON orders(user_id, created_at);
  CREATE INDEX IF NOT EXISTS orders_by_cafe ON orders(cafe_id, status);

  CREATE TABLE IF NOT EXISTS settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
`);

/** Fills an empty database with the test cafés. Runs once; later starts keep your changes. */
function seed() {
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
  db.exec('COMMIT');
  console.log('Seeded the database with the test cafés.');
}

seed();
