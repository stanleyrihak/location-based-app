import { deliveringOrderId } from '@shoot/shared';
import * as Location from 'expo-location';
import { createContext, type PropsWithChildren, use, useEffect, useState } from 'react';

import { useQueue } from '@/data/queries';
import { onSessionEnd } from '@/data/session';
import {
  sendSellerPosition,
  type ShareMode,
  startSharing,
  stopSharing,
} from '@/location/share-position';

const ShareContext = createContext<ShareMode | null>(null);

/** How the seller's position is shared right now, or null when there's no walk. */
export function useShareMode() {
  return use(ShareContext);
}

/**
 * Shares the seller's position exactly while the café has an order on its way. It follows
 * the queue, not the buttons, so it also stops when the order ends elsewhere, and starts again
 * if the app was closed in the middle of a walk.
 */
export function SharePositionProvider({ children }: PropsWithChildren) {
  const queue = useQueue();
  const orderId = deliveringOrderId(queue.data);
  const order = queue.data?.find((candidate) => candidate.id === orderId);
  const loaded = queue.data !== undefined;
  // The mode, with the order it's for: a mode for an old order means "nothing yet".
  const [state, setState] = useState<{ orderId: string; mode: ShareMode } | null>(null);
  const mode = state && state.orderId === orderId ? state.mode : null;

  useEffect(() => {
    // Before the queue is loaded we don't know yet: don't stop a walk that's running.
    if (!loaded) return;
    if (!order) {
      void stopSharing();
      return;
    }
    let cancelled = false;
    void startSharing(order).then((started) => {
      if (!cancelled) setState({ orderId: order.id, mode: started });
    });
    return () => {
      cancelled = true;
    };
    // Only a different walk (or none) restarts this, not every change to the order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, loaded]);

  // Without "Allow all the time": share while the app is open, at least.
  useEffect(() => {
    if (mode !== 'foreground' || !orderId) return;
    let subscription: Location.LocationSubscription | undefined;
    let stopped = false;
    void Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
      ({ coords }) =>
        void sendSellerPosition(orderId, {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
    )
      .then((watch) => {
        if (stopped) watch.remove();
        else subscription = watch;
      })
      .catch(() => {});
    return () => {
      stopped = true;
      subscription?.remove();
    };
  }, [mode, orderId]);

  // Signed out (or the server ended the session): nobody's walking any more.
  useEffect(() => onSessionEnd(() => void stopSharing()), []);

  return <ShareContext.Provider value={mode}>{children}</ShareContext.Provider>;
}
