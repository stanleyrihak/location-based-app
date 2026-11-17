import 'expo-sqlite/localStorage/install';

/**
 * The seller's sign-in token, like the customer app's (apps/customer/src/data/session.ts), under
 * its own key. It works like a password; a real release would keep it in the Keychain/Keystore
 * with expo-secure-store. Only this file would change.
 */
const TOKEN_KEY = 'seller-session-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Forgets the token and tells the session provider, which shows sign-in again. */
export function endSession() {
  localStorage.removeItem(TOKEN_KEY);
  for (const listener of listeners) listener();
}

/** Called when the session ends, for example when the server answers 401. Returns an unsubscribe. */
export function onSessionEnd(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
