import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

/**
 * Gets this phone's Expo push token, so the server can ring it for new orders even when the
 * app is closed or the phone is locked. Null when that isn't possible:
 * - notifications aren't allowed,
 * - it's an emulator or simulator (no push there),
 * - the app isn't linked to an Expo project yet (`eas init` writes the project id), or
 * - it runs in Expo Go on Android, which can't receive push (a development build can).
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    // Expo Go on Android, or no connection to Expo's servers right now.
    return null;
  }
}
