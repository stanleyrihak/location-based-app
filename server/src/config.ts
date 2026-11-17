import path from 'node:path';

/** The server folder, whatever folder the server was started from. */
const SERVER_ROOT = path.resolve(import.meta.dirname, '..');

export type Config = ReturnType<typeof loadConfig>;

/**
 * Everything the server reads from the environment, in one place, with development defaults.
 * Tests call it with `{}` to get the defaults without whatever is set on the computer.
 */
export function loadConfig(env: Record<string, string | undefined>) {
  return {
    port: Number(env.PORT ?? 4000),
    /** Where the SQLite file and uploaded photos live. Deleting it resets everything. */
    dataDir: path.resolve(env.DATA_DIR ?? path.join(SERVER_ROOT, 'data')),
    publicDir: path.join(SERVER_ROOT, 'public'),
    /**
     * Development: the SMS code is always this, and it's printed in the terminal instead of
     * being texted. An empty value gives random codes, also printed.
     */
    fixedSmsCode: env.SMS_CODE ?? '123456',
    /** Without a key the server uses fake payments (card 0002 declines). */
    stripeSecretKey: env.STRIPE_SECRET_KEY || undefined,
    /** The /dev routes (sell out an item, move the cafés) exist only outside production. */
    devRoutes: env.NODE_ENV !== 'production',
  };
}
