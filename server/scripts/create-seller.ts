import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { hashPassword } from '../src/auth/passwords.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db/open.ts';

/**
 * Creates a seller account for a café. Sellers can't sign up in the app; you make them here:
 *
 *   npm run create-seller -w @shoot/server -- --cafe saaripaahtimo \
 *     --email anna@example.com --name Anna --password 'a long password'
 */
const { values } = parseArgs({
  options: {
    cafe: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
  },
});

const { cafe, email, name, password } = values;
if (!cafe || !email || !name || !password) {
  console.error('Usage: --cafe <café id> --email <email> --name <name> --password <password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use a password of at least 8 characters.');
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();
const config = loadConfig(process.env);
const db = openDb(path.join(config.dataDir, 'shoot.db'));

const exists = db.prepare('SELECT 1 FROM cafes WHERE id = ?').get(cafe);
if (!exists) {
  const ids = (db.prepare('SELECT id FROM cafes ORDER BY id').all() as { id: string }[])
    .map((row) => row.id)
    .join(', ');
  console.error(`No café "${cafe}". Cafés: ${ids}`);
  process.exit(1);
}

try {
  db.prepare(
    'INSERT INTO staff (id, cafe_id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    randomUUID(),
    cafe,
    normalizedEmail,
    name,
    await hashPassword(password),
    new Date().toISOString(),
  );
} catch {
  console.error(`An account with ${normalizedEmail} already exists.`);
  process.exit(1);
}
console.log(`Created ${normalizedEmail} for ${cafe}. They can sign in to the seller app now.`);
