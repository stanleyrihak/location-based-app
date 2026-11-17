import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The app's settings live in app.json; this file only adds what can't be written there.
 *
 * google-services.json (Firebase, for push on Android) stays out of git because the repository
 * is public. Locally the file sits next to this one. On the EAS build server it doesn't exist,
 * so EAS provides it as a secret file variable, GOOGLE_SERVICES_JSON, holding its path there.
 *
 * GOOGLE_MAPS_API_KEY is for Google Maps on Android. It comes from apps/seller/.env.local
 * locally and from an EAS environment variable on the build server, never from git.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },
});
