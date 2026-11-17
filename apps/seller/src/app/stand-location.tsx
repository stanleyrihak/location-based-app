import { ApiError, type Coordinates, isLiveStatus } from '@shoot/shared';
import { Button, DeliveryMap, Icon, ThemedText, ThemedView } from '@shoot/ui';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQueue } from '@/data/queries';
import { useUpdateCafe } from '@/data/use-update-cafe';

const GUTTER = 24;
const BUSY_TEXT = 'Finish your open orders first: customers chose you by this distance.';

/**
 * "Sell from here": the stand goes where the phone is, with a pin to adjust (tap the map).
 * Not while orders are open: their customers ordered by the distance from the old spot.
 */
export default function StandLocationScreen() {
  const insets = useSafeAreaInsets();
  const update = useUpdateCafe();
  const queue = useQueue();
  const busy = (queue.data ?? []).some((order) => isLiveStatus(order.status));
  const [pin, setPin] = useState<Coordinates | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error('No permission');
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!cancelled) setPin({ latitude: coords.latitude, longitude: coords.longitude });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refusedBusy = update.error instanceof ApiError && update.error.code === 'cafe_busy';

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: GUTTER, gap: 8 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to the stand"
          hitSlop={12}
          style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
        >
          <Icon name="back" />
        </Pressable>
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Sell from here'}
        </ThemedText>
        <ThemedText color="ink2">
          {'The pin is where you are. Tap the map to move it to your stand.'}
        </ThemedText>
      </View>

      <View style={{ flex: 1, margin: GUTTER, justifyContent: 'center' }}>
        {pin ? (
          <DeliveryMap
            places={[{ id: 'stand', kind: 'cafe', coordinates: pin, title: 'Your stand' }]}
            dots={[]}
            showMyLocation
            onPress={setPin}
            style={{ flex: 1 }}
            accessibilityLabel="Map with the pin for your stand. Tap to move it."
          />
        ) : failed ? (
          <ThemedText color="ink2" style={{ textAlign: 'center' }}>
            {'We couldn’t find your position. Turn on location for Shoot in Settings.'}
          </ThemedText>
        ) : (
          <ActivityIndicator />
        )}
      </View>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 12, gap: 8 }}>
        {(busy || refusedBusy) && (
          <ThemedText color="ink2" style={{ textAlign: 'center' }}>
            {BUSY_TEXT}
          </ThemedText>
        )}
        {update.isError && !refusedBusy && (
          <ThemedText color="error" accessibilityRole="alert" style={{ textAlign: 'center' }}>
            {'That didn’t save. Try again.'}
          </ThemedText>
        )}
        <Button
          disabled={!pin || busy}
          loading={update.isPending}
          onPress={() =>
            pin && update.mutate({ coordinates: pin }, { onSuccess: () => router.back() })
          }
        >
          {'Sell from here'}
        </Button>
      </View>
    </ThemedView>
  );
}
