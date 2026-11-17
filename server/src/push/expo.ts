import type { DatabaseSync } from 'node:sqlite';

import { Expo } from 'expo-server-sdk';

import { createPushService } from './service.ts';

/**
 * Real push notifications through Expo's push service, which forwards them to Apple (APNs)
 * and Google (FCM). The apps register their Expo push token with POST /me/push-token or
 * /seller/push-token. Sending needs no key in development; Android delivery needs the app's
 * Firebase credentials uploaded to the Expo project.
 */
export function createExpoPush(db: DatabaseSync) {
  const expo = new Expo();
  return createPushService(db, async (messages) => {
    const chunks = expo.chunkPushNotifications(
      messages.map((message) => ({
        to: message.token,
        title: message.title,
        body: message.body,
        sound: message.sound ? 'default' : null,
        // Android shows high-priority notifications at once, even when the phone is idle.
        priority: 'high',
      })),
    );
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  });
}
