import { createApiClient } from '@shoot/shared';
import Constants from 'expo-constants';

import { endSession, getToken } from '@/data/session';

export { ApiError } from '@shoot/shared';

/**
 * Where the server is.
 *
 * EXPO_PUBLIC_API_URL wins if it's set (in a .env.local file), for example to use another
 * server. Otherwise the app assumes the server runs on the same computer as
 * `npx expo start`: Expo already knows that computer's address on the Wi-Fi (hostUri, like
 * "192.168.1.20:8081"), so the phone uses the same address with the server's port, 4000.
 */
function findApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = findApiUrl();

/**
 * The customer's connection to the server: the shared client (@shoot/shared) with this app's
 * token, and a 401 ends the session, which sends the user back to sign-in.
 */
export const { request, authHeaders } = createApiClient({
  baseUrl: API_URL,
  getToken,
  onUnauthorized: endSession,
});
