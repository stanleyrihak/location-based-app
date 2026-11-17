// The database tables. `CREATE … IF NOT EXISTS` makes this safe to run on every start.
// A changed table needs a reset in development (`npm run reset`); there are no migrations yet.
export const SCHEMA = `
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
`;
