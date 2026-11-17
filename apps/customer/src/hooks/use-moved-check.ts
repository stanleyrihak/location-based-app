import { isLiveStatus, movedFromSpot, type Order } from '@shoot/shared';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useOrders } from '@/data/queries';
import { distanceInMetres } from '@/utils/geo';

/**
 * Orders the app already asked about since it was last opened. Asking once per opening is
 * enough: whether they answered "No, I'm still here" or swiped the sheet away, they've seen
 * it. Cleared when the app goes to the background, so the next opening asks again.
 */
const askedThisVisit = new Set<string>();

/**
 * E10: when the app opens (starts, or comes back to the front) with a live order, and the
 * phone is more than 30 m from that order's delivery spot, opens "Moved to a different seat?".
 * Only for a signed-in customer: the root layout renders it after onboarding.
 */
export function useMovedCheck() {
  const queryClient = useQueryClient();
  const orders = useOrders();
  const loaded = orders.data !== undefined;

  useEffect(() => {
    if (!loaded) return;
    let checking = false;

    async function check() {
      const live = (queryClient.getQueryData<Order[]>(['orders']) ?? []).filter((order) =>
        isLiveStatus(order.status),
      );
      if (checking || live.length === 0) return;
      checking = true;
      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const order = live.find((candidate) => movedFromSpot(candidate, coords, askedThisVisit));
        if (!order) return;
        askedThisVisit.add(order.id);
        router.push({
          pathname: '/moved/[id]',
          params: { id: order.id, distance: Math.round(distanceInMetres(order.deliverTo, coords)) },
        });
      } catch {
        // No location permission or no fix: nothing to ask. The café still has the old spot.
      } finally {
        checking = false;
      }
    }

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
      if (state === 'background') askedThisVisit.clear();
    });
    return () => subscription.remove();
  }, [loaded, queryClient]);
}
