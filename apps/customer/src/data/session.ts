import 'expo-sqlite/localStorage/install';

/**
 * The sign-in token from POST /auth/verify. Every request after sign-in sends it, and the
 * server knows from it who you are.
 *
 * Kept in localStorage (SQLite) for now. A token works like a password, so the real app
 * should keep it in the iOS Keychain / Android Keystore with expo-secure-store. Only this
 * file would change.
 */
const TOKEN_KEY = 'session-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** Forgets the token and tells whoever listens (the onboarding provider) to show sign-in again. */
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
