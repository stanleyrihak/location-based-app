import { ApiError, type Coordinates, type Order } from '@shoot/shared';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { sendPosition } from '@/data/api';

/**
 * The seller's position during the walk ("On my way" to "Delivered"), also with the screen
 * locked. Android allows that through a foreground service: while it runs, a notification
 * says so, and the phone keeps the app alive. Background location doesn't work in Expo Go.
 */
export const SELLER_POSITION_TASK = 'seller-position';

/** Which order the task sends positions for. Kept on disk: the task may run without the screens. */
const ORDER_KEY = 'seller-delivering-order';

/**
 * - 'background': shared with the screen locked too.
 * - 'foreground': only while the app is open (no "Allow all the time"); see useSharePosition.
 * - 'denied': no location permission at all; the customer sees no dot.
 */
export type ShareMode = 'background' | 'foreground' | 'denied';

/** Sends one position. The server refuses it once the walk is over; then sharing stops. */
export async function sendSellerPosition(orderId: string, coordinates: Coordinates) {
  try {
    await sendPosition(orderId, coordinates);
  } catch (error) {
    // 409: delivered or changed; 404: gone; 401: signed out. A network error just waits for
    // the next position.
    if (error instanceof ApiError && [401, 404, 409].includes(error.status)) {
      await stopSharing();
    }
  }
}

// Defined when this file is first imported (from the root layout), before anything renders:
// Android may start the app just to deliver positions to this task.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  SELLER_POSITION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;
    const orderId = localStorage.getItem(ORDER_KEY);
    const latest = data.locations.at(-1);
    if (!orderId || !latest) return;
    await sendSellerPosition(orderId, {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
    });
  },
);

/** Background permission ("Allow all the time"), asking only if Android still lets us ask. */
async function hasBackgroundPermission() {
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestBackgroundPermissionsAsync()).granted;
}

/** Starts sharing for this order. Safe to call again for the same order (no second service). */
export async function startSharing(order: Order): Promise<ShareMode> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return 'denied';
  localStorage.setItem(ORDER_KEY, order.id);

  if (!(await hasBackgroundPermission())) return 'foreground';
  if (!(await Location.hasStartedLocationUpdatesAsync(SELLER_POSITION_TASK))) {
    await Location.startLocationUpdatesAsync(SELLER_POSITION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: `Delivering order #${order.number}`,
        notificationBody:
          'Shoot shares your position with the customer until you mark it delivered.',
      },
    });
  }
  return 'background';
}

/** Stops sharing: at "Delivered", when the order ends elsewhere, and on sign-out. */
export async function stopSharing() {
  localStorage.removeItem(ORDER_KEY);
  if (await Location.hasStartedLocationUpdatesAsync(SELLER_POSITION_TASK)) {
    await Location.stopLocationUpdatesAsync(SELLER_POSITION_TASK);
  }
}
