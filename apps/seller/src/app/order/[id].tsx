import { type Order, secondsToAccept } from '@shoot/shared';
import { Button, Icon, Radius, Shadow, ThemedText, ThemedView, useTheme } from '@shoot/ui';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Countdown, useNow } from '@/components/countdown';
import { useQueue } from '@/data/queries';
import { actionErrorMessage, useOrderActions } from '@/data/use-order-actions';
import { ago, formatPrice } from '@/utils/format';

const GUTTER = 24;

const STATUS_TEXT: Record<Order['status'], string> = {
  received: 'New: waiting for you',
  preparing: 'Making it',
  'on-the-way': 'On the way',
  delivered: 'Delivered',
  declined: 'Declined',
  expired: 'Not accepted in time',
  cancelled: 'Cancelled by the customer',
};

/** One order: who it's for and where they are, what to make, and the next step. */
export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Read from the queue: it's already loaded and kept live, so the screen follows every change.
  const queue = useQueue();
  const order = queue.data?.find((candidate) => candidate.id === id);
  const now = useNow();

  if (!order) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        {queue.isPending ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText color="ink2">{'This order isn’t in your queue any more.'}</ThemedText>
            <Button variant="text" onPress={() => router.back()}>
              {'Back to orders'}
            </Button>
          </>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
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

        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
            <ThemedText type="headlineLarge" accessibilityRole="header" style={{ flex: 1 }}>
              {`Order #${order.number}`}
            </ThemedText>
            {order.status === 'received' && <Countdown order={order} now={now} />}
          </View>
          <ThemedText color="ink2">{`${STATUS_TEXT[order.status]} · ${ago(order.createdAt, now)}`}</ThemedText>
        </View>

        <Delivery order={order} />
        <Items order={order} />
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 12, gap: 8 }}>
        <NextStep order={order} now={now} />
      </View>
    </ThemedView>
  );
}

/** Where to take it: the spot's label, or the customer's two photos. */
function Delivery({ order }: { order: Order }) {
  const theme = useTheme();
  const { delivery } = order;

  if (delivery.kind === 'spot') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="qr" />
        <View style={{ flex: 1 }}>
          <ThemedText type="label" color="ink2">
            {'Spot code scanned'}
          </ThemedText>
          <ThemedText type="title" weight="bold">
            {delivery.spotLabel}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="label" color="ink2">
        {'Find them from their photos'}
      </ThemedText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { uri: delivery.selfie, label: 'The customer' },
          { uri: delivery.spot, label: 'Where they sit' },
        ].map((photo) => (
          <View key={photo.label} style={{ flex: 1, gap: 6 }}>
            <Image
              source={photo.uri}
              contentFit="cover"
              accessibilityLabel={photo.label}
              style={{
                aspectRatio: 3 / 4,
                borderRadius: Radius.card,
                backgroundColor: theme.surface2,
              }}
            />
            <ThemedText type="caption" color="ink2">
              {photo.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** What to make, and what the customer asked for. */
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
      {order.lines.map((line) => (
        <View key={line.itemId} style={{ flexDirection: 'row', gap: 12 }}>
          <ThemedText weight="bold" style={{ width: 32, fontVariant: ['tabular-nums'] }}>
            {`${line.quantity}×`}
          </ThemedText>
          <ThemedText style={{ flex: 1 }}>{line.name}</ThemedText>
        </View>
      ))}
      {order.note !== '' && (
        <ThemedText type="subhead" style={{ marginTop: 4 }}>{`Note: “${order.note}”`}</ThemedText>
      )}
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

/** The one button that moves the order on, plus Decline while it's new. */
function NextStep({ order, now }: { order: Order; now: number }) {
  const actions = useOrderActions(order.id);
  const pending = [actions.accept, actions.startDelivery, actions.markDelivered].find(
    (action) => action.isPending,
  );
  const failed = [actions.accept, actions.startDelivery, actions.markDelivered].find(
    (action) => action.isError,
  );

  let main = null;
  if (order.status === 'received') {
    const seconds = secondsToAccept(order, now) ?? 0;
    main =
      seconds > 0 ? (
        <>
          <Button onPress={() => actions.accept.mutate()} loading={actions.accept.isPending}>
            {'Accept'}
          </Button>
          <Button
            variant="text"
            disabled={pending !== undefined}
            onPress={() => router.push({ pathname: '/decline/[id]', params: { id: order.id } })}
          >
            {'Decline'}
          </Button>
        </>
      ) : (
        <ThemedText color="ink2" style={{ textAlign: 'center' }}>
          {'Not accepted in time. The customer wasn’t charged.'}
        </ThemedText>
      );
  } else if (order.status === 'preparing') {
    main = (
      <Button
        onPress={() => actions.startDelivery.mutate()}
        loading={actions.startDelivery.isPending}
      >
        {'On my way'}
      </Button>
    );
  } else if (order.status === 'on-the-way') {
    main = (
      <Button
        onPress={() => actions.markDelivered.mutate()}
        loading={actions.markDelivered.isPending}
      >
        {'Delivered'}
      </Button>
    );
  }

  return (
    <>
      {failed && (
        <ThemedText color="error" accessibilityRole="alert" style={{ textAlign: 'center' }}>
          {actionErrorMessage(failed.error)}
        </ThemedText>
      )}
      {main}
    </>
  );
}
