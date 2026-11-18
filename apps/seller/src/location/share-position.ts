import { ApiError, type Coordinates, createSerial, type Order } from '@shoot/shared';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { sendPosition } from '@/data/api';

/**
 * The seller's position during the walk ("On my way" to "Delivered"), also with the screen
 * locked. Android allows that through a foreground service: while it runs, a notification
 * says so, and the phone keeps the app alive. The iPhone allows it with "Always" permission
 * (UIBackgroundModes location) and shows the blue location indicator meanwhile. Background
 * location doesn't work in Expo Go.
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

/** Starts and stops run one at a time: a stop still finishing must not undo the next start. */
const serial = createSerial();

/** Sends one position. The server refuses it once the walk is over; then sharing stops. */
export async function sendSellerPosition(orderId: string, coordinates: Coordinates) {
  try {
    await sendPosition(orderId, coordinates);
  } catch (error) {
    // 409: delivered or changed; 404: gone; 401: signed out. A network error just waits for
    // the next position. Only if it's still this order's walk: a late answer for the order
    // just delivered must not stop sharing for the next one.
    if (
      error instanceof ApiError &&
      [401, 404, 409].includes(error.status) &&
      localStorage.getItem(ORDER_KEY) === orderId
    ) {
      await stopSharing();
    }
  }
}

// Defined when this file is first imported, from index.ts (the app's entry): Android may start
// the app without any screen, just to deliver positions to this task.
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

/** Background permission ("Allow all the time"), asking only if the phone still lets us ask. */
async function hasBackgroundPermission() {
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestBackgroundPermissionsAsync()).granted;
}

/** Starts sharing for this order. Safe to call again for the same order (no second service). */
export function startSharing(order: Order): Promise<ShareMode> {
  return serial(() => start(order));
}

async function start(order: Order): Promise<ShareMode> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return 'denied';
  const previous = localStorage.getItem(ORDER_KEY);
  localStorage.setItem(ORDER_KEY, order.id);

  if (!(await hasBackgroundPermission())) return 'foreground';
  const running = await Location.hasStartedLocationUpdatesAsync(SELLER_POSITION_TASK);
  // Another order's walk: restart, so the notification names this order.
  if (running && previous !== order.id) {
    await Location.stopLocationUpdatesAsync(SELLER_POSITION_TASK);
  }
  if (!running || previous !== order.id) {
    await Location.startLocationUpdatesAsync(SELLER_POSITION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      // iPhone: show the blue indicator, and don't pause updates while the seller stands still.
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
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
export function stopSharing(): Promise<void> {
  return serial(async () => {
    localStorage.removeItem(ORDER_KEY);
    if (await Location.hasStartedLocationUpdatesAsync(SELLER_POSITION_TASK)) {
      await Location.stopLocationUpdatesAsync(SELLER_POSITION_TASK);
    }
  });
}
