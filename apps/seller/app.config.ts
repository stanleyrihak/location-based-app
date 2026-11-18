import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The app's settings live in app.json; this file only adds what can't be written there.
 *
 * GOOGLE_MAPS_API_KEY is for Google Maps on Android. It comes from apps/seller/.env.local
 * locally and from an EAS environment variable on the build server, never from git.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
});
