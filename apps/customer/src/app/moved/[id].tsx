import { Button, ThemedText } from '@shoot/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrders } from '@/data/queries';
import { formatDistance } from '@/utils/format';

/**
 * E10 "Moved to a different seat?", as a sheet. Opened by useMovedCheck when the app opens
 * more than 30 m from the order's delivery spot. A new spot photo (one tap; the selfie stays)
 * or a scan of the code at the new seat. "No" closes it until the app is opened again.
 */
export default function MovedSheet() {
  const insets = useSafeAreaInsets();
  const { id, distance } = useLocalSearchParams<{ id: string; distance?: string }>();
  const order = useOrders().data?.find((candidate) => candidate.id === id);
  if (!order) return null;

  const metres = Number(distance);
  const canTakePhoto = order.delivery.kind === 'photos';

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
