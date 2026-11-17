import path from 'node:path';

/** Everything the server reads from the environment, in one place, with development defaults. */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  /** Where the SQLite file and uploaded photos live. Deleting it resets everything. */
  dataDir: path.resolve(process.env.DATA_DIR ?? 'data'),
  publicDir: path.resolve('public'),
  /**
   * Development: the SMS code is always this, and it's printed in the terminal instead of
   * being texted. A real server would send a random code through an SMS service.
   */
  fixedSmsCode: process.env.SMS_CODE ?? '123456',
  /** Café staff send this in the X-Staff-Key header. Real staff would sign in with an account. */
  staffKey: process.env.STAFF_KEY ?? 'dev-staff-key',
  /** Move orders along by the clock, because no café app exists yet to do it by hand. */
  autoAdvance: process.env.AUTO_ADVANCE !== 'false',
  /** The /dev routes (sell out an item, move the cafés) exist only outside production. */
  devRoutes: process.env.NODE_ENV !== 'production',
};
