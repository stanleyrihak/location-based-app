import { isLiveStatus } from '@shoot/shared';
import { Button, CallButton, ThemedText } from '@shoot/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNearbyCafe, useOrders } from '@/data/queries';
import { formatDistance } from '@/utils/format';
import { distanceInMetres } from '@/utils/geo';

/**
 * E10 "Moved to a different seat?", as a sheet. Opened by useMovedCheck when the app opens
 * more than 30 m from the order's delivery spot. A new spot photo (one tap; the selfie stays)
 * or a scan of the code at the new seat. "No" closes it until the app is opened again.
 */
export default function MovedSheet() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    distance?: string;
    latitude?: string;
    longitude?: string;
  }>();
  const order = useOrders().data?.find((candidate) => candidate.id === params.id);
  const { cafe } = useNearbyCafe(order?.cafeId ?? '');
  const live = order !== undefined && isLiveStatus(order.status);

  // The order ended while the sheet was open (delivered, or the café declined): nothing to move.
  useEffect(() => {
    if (order && !live) router.back();
  }, [order, live]);
  if (!order || !live) return null;

  const metres = Number(params.distance);
  const canTakePhoto = order.delivery.kind === 'photos';
  // Checked here first, so nobody takes a photo only to hear it's too far. The server checks
  // again when the new spot is saved.
  const here = { latitude: Number(params.latitude), longitude: Number(params.longitude) };
  const outOfRange =
    cafe !== undefined &&
    Number.isFinite(here.latitude) &&
    distanceInMetres(here, cafe.coordinates) > cafe.radiusM;

  if (outOfRange) {
    return (
      <View
        style={{ paddingTop: 28, paddingHorizontal: 20, paddingBottom: insets.bottom + 8, gap: 12 }}
      >
        <ThemedText type="title" weight="bold" accessibilityRole="header">
          {'You’re outside the delivery area'}
        </ThemedText>
        <ThemedText color="ink2">
          {`${order.cafeName} delivers within ${formatDistance(cafe.radiusM)}, and you’ve moved further than that. Go back to your first spot, or call them.`}
        </ThemedText>
        <View style={{ gap: 12, marginTop: 8 }}>
          <CallButton phone={order.cafePhone} label={`Call ${order.cafeName}`} />
          <Button variant="text" onPress={() => router.back()}>
            {'OK'}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ paddingTop: 28, paddingHorizontal: 20, paddingBottom: insets.bottom + 8, gap: 12 }}
    >
      <ThemedText type="title" weight="bold" accessibilityRole="header">
        {'Moved to a different seat?'}
      </ThemedText>
      <ThemedText color="ink2">
        {Number.isFinite(metres)
          ? `You’re about ${formatDistance(metres)} from where ${order.cafeName} will bring your order. Show them your new spot, so they find you.`
          : `Show ${order.cafeName} your new spot, so they find you.`}
      </ThemedText>
      <View style={{ gap: 12, marginTop: 8 }}>
        {canTakePhoto && (
          <Button
            icon="camera"
            onPress={() => router.replace({ pathname: '/moved/photo', params: { id: order.id } })}
          >
            {'Take a new spot photo'}
          </Button>
        )}
        <Button
          variant={canTakePhoto ? 'secondary' : 'primary'}
          icon="qr"
          onPress={() => router.replace({ pathname: '/moved/scan', params: { id: order.id } })}
        >
          {'Scan the code at your seat'}
        </Button>
        <Button variant="text" onPress={() => router.back()}>
          {'No, I’m still here'}
        </Button>
      </View>
    </View>
  );
}
