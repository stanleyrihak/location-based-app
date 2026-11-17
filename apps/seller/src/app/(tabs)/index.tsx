import { groupSellerQueue, type Order, secondsToAccept } from '@shoot/shared';
import { Button, ThemedText, ThemedView } from '@shoot/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNow } from '@/components/countdown';
import { OrderTile } from '@/components/order-tile';
import { useQueue } from '@/data/queries';
import { actionErrorMessage, useOrderActions } from '@/data/use-order-actions';

const GUTTER = 24;

/**
 * The café's queue. New orders on top, with their 5-minute countdown; then the ones being
 * made, the one on its way, and today's finished ones.
 */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const queue = useQueue();
  // One clock for the whole list, so every countdown ticks together.
  const now = useNow();
  // Only a pull shows the spinner; live updates and background refetches stay quiet.
  const [pulling, setPulling] = useState(false);

  if (queue.isPending) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const { newOrders, preparing, onTheWay, recent } = groupSellerQueue(queue.data ?? []);
  const empty = (queue.data ?? []).length === 0;
  const open = (order: Order) => router.push({ pathname: '/order/[id]', params: { id: order.id } });

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
          gap: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              queue.refetch().finally(() => setPulling(false));
            }}
          />
        }
      >
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Orders'}
        </ThemedText>

        {queue.isError && (
          <ThemedText color="ink2">
            {'We couldn’t load the orders. Pull down to try again.'}
          </ThemedText>
        )}
        {empty && !queue.isError && (
          <ThemedText color="ink2" style={{ textAlign: 'center', marginTop: 32 }}>
            {'No orders yet. New ones appear here and ring the phone.'}
          </ThemedText>
        )}

        <Section title="New" orders={newOrders} now={now} onOpen={open} />
        <Section title="Making" orders={preparing} now={now} onOpen={open} />
        <Section title="On the way" orders={onTheWay} now={now} onOpen={open} />
        <Section title="Earlier today" orders={recent} now={now} onOpen={open} />
      </ScrollView>
    </ThemedView>
  );
}

function Section({
  title,
  orders,
  now,
  onOpen,
}: {
  title: string;
  orders: Order[];
  now: number;
  onOpen: (order: Order) => void;
}) {
  // An empty section would be a heading with nothing under it.
  if (orders.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      <ThemedText type="label" color="ink2" accessibilityRole="header">
        {`${title} · ${orders.length}`}
      </ThemedText>
      {orders.map((order) => (
        <OrderTile
          key={order.id}
          order={order}
          now={now}
          onPress={() => onOpen(order)}
          actions={
            order.status === 'received' && (secondsToAccept(order, now) ?? 0) > 0 ? (
              <NewOrderActions order={order} />
            ) : undefined
          }
        />
      ))}
    </View>
  );
}

/** Accept and Decline right on the tile, so a busy seller doesn't need to open the order. */
function NewOrderActions({ order }: { order: Order }) {
  const { accept } = useOrderActions(order.id);

  return (
    <View style={{ gap: 8 }}>
      {accept.isError && (
        <ThemedText type="subhead" color="error" accessibilityRole="alert">
          {actionErrorMessage(accept.error)}
        </ThemedText>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          variant="secondary"
          size="small"
          disabled={accept.isPending}
          onPress={() => router.push({ pathname: '/decline/[id]', params: { id: order.id } })}
          style={{ flex: 1 }}
        >
          {'Decline'}
        </Button>
        <Button
          size="small"
          loading={accept.isPending}
          onPress={() => accept.mutate()}
          style={{ flex: 1 }}
        >
          {'Accept'}
        </Button>
      </View>
    </View>
  );
}
