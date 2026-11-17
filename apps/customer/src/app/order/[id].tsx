import type { Order } from '@shoot/shared';
import {
  Button,
  CallButton,
  DeliveryMap,
  Icon,
  type MapDot,
  Radius,
  Shadow,
  ThemedText,
  ThemedView,
  useTheme,
} from '@shoot/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderProgress } from '@/components/order-card';
import { minutesLeft, readyTime, STATUS_LABEL } from '@/data/order-format';
import { isLive, useOrders, useTrack } from '@/data/queries';
import { useShareMyPosition } from '@/hooks/use-share-my-position';
import { formatPrice } from '@/utils/format';

const GUTTER = 24;
const MAP_HEIGHT = 280;

/**
 * 4.2 Order status: where the order is, and, once it's on its way, the seller walking over on
 * the map. Read from the Orders list, which the live connection keeps up to date.
 */
export default function OrderStatusScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orders = useOrders();
  const order = orders.data?.find((candidate) => candidate.id === id);
  const onTheWay = order?.status === 'on-the-way';
  const track = useTrack(id, onTheWay);
  useShareMyPosition(order);

  if (!order) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        {orders.isPending ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText color="ink2">{'We couldn’t find this order.'}</ThemedText>
            <Button variant="text" onPress={() => router.back()}>
              {'Back to orders'}
            </Button>
          </>
        )}
      </ThemedView>
    );
  }

  const seller = onTheWay ? track.data?.seller : null;
  const dots: MapDot[] = seller ? [{ id: 'seller', kind: 'seller', coordinates: seller }] : [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: GUTTER,
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to orders"
          hitSlop={12}
          style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
        >
          <Icon name="back" />
        </Pressable>

        <View style={{ gap: 6 }}>
          <ThemedText type="headlineLarge" accessibilityRole="header">
            {STATUS_LABEL[order.status]}
          </ThemedText>
          <ThemedText color="ink2">{statusDetail(order, orders.dataUpdatedAt)}</ThemedText>
        </View>

        {isLive(order) && <OrderProgress order={order} />}

        {isLive(order) && (
          <View style={{ gap: 8 }}>
            <DeliveryMap
              places={[
                { id: 'spot', kind: 'spot', coordinates: order.deliverTo, title: 'Your spot' },
              ]}
              dots={dots}
              showMyLocation
              style={{ height: MAP_HEIGHT }}
              accessibilityLabel={
                seller
                  ? `Map: ${order.cafeName} is on the way to your spot.`
                  : 'Map: your spot, where the order will be brought.'
              }
            />
            {onTheWay && !seller && (
              <ThemedText type="subhead" color="ink2">
                {`${order.cafeName} will show up on the map in a moment.`}
              </ThemedText>
            )}
          </View>
        )}

        <Items order={order} />

        {isLive(order) && <CallButton phone={order.cafePhone} label={`Call ${order.cafeName}`} />}
      </ScrollView>
    </ThemedView>
  );
}

/** The line under the status: who's doing what, and when it should arrive. */
function statusDetail(order: Order, now: number) {
  const left = minutesLeft(order, now);
  const time = readyTime(order);
  switch (order.status) {
    case 'received':
      return `Waiting for ${order.cafeName} to accept. You’re only charged once they do.`;
    case 'preparing':
      return left !== null && left > 0
        ? `${order.cafeName} is making it. Arriving around ${time}.`
        : `${order.cafeName} is making it. Any moment now.`;
    case 'on-the-way':
      return `${order.cafeName} is walking over to your spot.`;
    case 'delivered':
      return 'Delivered. Enjoy!';
    case 'declined':
    case 'expired':
    case 'cancelled':
      return 'You weren’t charged.';
  }
}

/** What's in it. */
function Items({ order }: { order: Order }) {
  const theme = useTheme();

  return (
    <View
      style={{
        gap: 10,
        padding: 16,
        borderRadius: Radius.card,
        backgroundColor: theme.surface,
        boxShadow: Shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText weight="bold">{order.cafeName}</ThemedText>
        <ThemedText type="caption" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
          {`Order #${order.number}`}
        </ThemedText>
      </View>
      {order.lines.map((line) => (
        <View key={line.itemId} style={{ flexDirection: 'row', gap: 12 }}>
          <ThemedText weight="bold" style={{ width: 32, fontVariant: ['tabular-nums'] }}>
            {`${line.quantity}×`}
          </ThemedText>
          <ThemedText style={{ flex: 1 }}>{line.name}</ThemedText>
        </View>
      ))}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: theme.line,
          paddingTop: 10,
        }}
      >
        <ThemedText color="ink2">{`Paid with ${order.paymentLabel}`}</ThemedText>
        <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPrice(order.totalCents)}
        </ThemedText>
      </View>
    </View>
  );
}
