import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The app's settings live in app.json; this file only adds what can't be written there.
 *
 * GOOGLE_MAPS_API_KEY is for Google Maps on Android (the iPhone uses Apple Maps, no key). It
 * comes from apps/customer/.env.local or an EAS environment variable, never from git: the
 * repository is public.
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
