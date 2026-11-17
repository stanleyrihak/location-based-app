/**
 * The computer running Metro, for finding the server next to it in development.
 *
 * - `hostUri` ("192.168.1.20:8081") comes from Expo Go and development clients.
 * - A plain debug build (`npx expo run:ios`) has no hostUri, but it loads its code from Metro
 *   ("http://192.168.1.20:8081/index.bundle?…"), so the host is in that address.
 * - A release build loads its code from a file: null, and the app needs EXPO_PUBLIC_API_URL.
 */
export function devServerHost(
  hostUri: string | undefined,
  scriptUrl: string | undefined,
): string | null {
  if (hostUri) return hostUri.split(':')[0] || null;
  const match = scriptUrl ? /^https?:\/\/([^:/?#]+)/.exec(scriptUrl) : null;
  return match ? match[1] : null;
}
