import type { Order } from '@shoot/shared';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { sendMyPosition } from '@/data/api';

/**
 * Sends your position to the café while the order is on its way, so the seller can find you
 * (a separate dot on their map; your delivery spot stays where you paid). Only while this
 * screen is open and the app is in front: the app never shares your position otherwise.
 * At most every 5 s, and only after you moved 10 m.
 */
export function useShareMyPosition(order: Order | undefined) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const orderId = order?.id;
  const onTheWay = order?.status === 'on-the-way';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!orderId || !onTheWay || !active) return;
    let subscription: Location.LocationSubscription | undefined;
    let stopped = false;

    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      ({ coords }) => {
        // A failed send doesn't matter: the next move sends again.
        sendMyPosition(orderId, { latitude: coords.latitude, longitude: coords.longitude }).catch(
          () => {},
        );
      },
    )
      .then((watch) => {
        if (stopped) watch.remove();
        else subscription = watch;
      })
      // No permission any more: the café still has your delivery spot and photos.
      .catch(() => {});

    return () => {
      stopped = true;
      subscription?.remove();
    };
  }, [orderId, onTheWay, active]);
}
