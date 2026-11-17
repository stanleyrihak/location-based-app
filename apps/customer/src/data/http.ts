import Constants from 'expo-constants';

import { endSession, getToken } from '@/data/session';

/**
 * Where the server is.
 *
 * EXPO_PUBLIC_API_URL wins if it's set (in a .env.local file), for example to use your
 * friend's server. Otherwise the app assumes the test server runs on the same computer as
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
 * Any failed request. `code` is the server's machine-readable reason ("sold_out",
 * "out_of_range"), `details` its extra fields. Status 0 means the server couldn't be reached.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TIMEOUT_MS = 15_000;

/** The Authorization header, when signed in. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Sends a request to the server and returns the JSON answer. Throws ApiError for anything
 * that isn't a success, so callers (and React Query) only need to handle one kind of error.
 */
export async function request<T>(
  path: string,
  options: { method?: string; json?: unknown } = {},
): Promise<T> {
  // Without a timeout, a request to a server that's off can hang for a minute or more.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
      },
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'network', 'We can’t reach the server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json().catch(() => ({}));
  if (response.ok) {
    return body as T;
  }

  const { error, message, ...details } = body as Record<string, unknown>;
  if (response.status === 401) {
    // The token is missing, expired, or the account was deleted: back to sign-in.
    endSession();
  }
  throw new ApiError(
    response.status,
    typeof error === 'string' ? error : 'unknown',
    typeof message === 'string' ? message : 'Something went wrong.',
    details,
  );
}
