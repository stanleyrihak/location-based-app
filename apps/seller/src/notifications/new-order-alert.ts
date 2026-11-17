import type { Order } from '@shoot/shared';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

/** Android groups notifications into channels; this one is loud and shows on the lock screen. */
export const ORDERS_CHANNEL = 'orders';

/**
 * Orders the app already rang for over the live connection, with when. The push for the same
 * order arrives a moment later; the handler below skips it, so the seller hears one alert, not two.
 */
const alerted = new Map<string, number>();
const REMEMBER_MS = 60_000;

function alreadyAlerted(orderId: string) {
  const at = alerted.get(orderId);
  return at !== undefined && Date.now() - at < REMEMBER_MS;
}

/**
 * Sets up how notifications behave in this app. Called once at start.
 * - The Android channel for orders (importance max: sound, heads-up banner).
 * - While the app is open, notifications show as a banner with sound, except a push for an
 *   order that was just alerted over the live connection.
 */
export function setUpNotifications() {
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(ORDERS_CHANNEL, {
      name: 'New orders',
      importance: AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
    });
  }

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as { orderId?: string; local?: boolean };
      const duplicate = !data.local && data.orderId !== undefined && alreadyAlerted(data.orderId);
      return {
        shouldShowBanner: !duplicate,
        shouldShowList: !duplicate,
        shouldPlaySound: !duplicate,
        shouldSetBadge: false,
      };
    },
  });
}

/** Asks for permission to show notifications (Android 13+ and iOS ask the user once). */
export async function askNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

function itemCount(order: Order) {
  const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return count === 1 ? '1 item' : `${count} items`;
}

/**
 * Rings for a new order while the app is open: a notification with sound right away
 * (trigger: null), and a vibration in case the phone is on silent.
 */
export async function alertNewOrder(order: Order) {
  alerted.set(order.id, Date.now());
  Vibration.vibrate([0, 400, 200, 400]);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New order #${order.number}`,
      body: `${itemCount(order)} · accept within 5 minutes`,
      sound: 'default',
      data: { orderId: order.id, local: true },
    },
    trigger: Platform.OS === 'android' ? { channelId: ORDERS_CHANNEL } : null,
  });
}
