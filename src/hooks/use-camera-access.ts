import { useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Camera permission for a camera screen:
 * - asks once, as soon as the screen opens, if the user hasn't decided yet
 * - checks again when the app comes back to the front, so turning the camera on in
 *   Settings and returning works without leaving the screen
 *
 * `status`: 'loading' until known, then 'granted' or 'denied'.
 */
export function useCameraAccess() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();

  const undecided = permission !== null && !permission.granted && permission.canAskAgain;

  useEffect(() => {
    // "Can ask again" and not granted means the system dialog hasn't been shown yet
    // (or was dismissed). Show it now: the user opened this screen to use the camera.
    if (undecided) {
      requestPermission();
    }
  }, [undecided, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getPermission();
      }
    });
    // Stop listening when the screen closes, or the listener would live on.
    return () => subscription.remove();
  }, [getPermission]);

  if (permission === null || undecided) {
    return 'loading';
  }
  return permission.granted ? 'granted' : 'denied';
}
