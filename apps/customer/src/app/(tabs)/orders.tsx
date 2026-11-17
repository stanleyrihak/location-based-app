import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LiveOrderCard, PastOrderRow } from '@/components/order-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { minutesLeft, readyTime, STATUS_LABEL } from '@/data/order-format';
import { isLive, useOrders } from '@/data/queries';

const GUTTER = 24;

/** 2.10 Orders: orders on their way at the top, delivered ones under "Earlier". */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const orders = useOrders();
  // Only a pull shows the spinner. isRefetching is also true for the automatic 30 s
  // refresh, which should happen quietly.
  const [pulling, setPulling] = useState(false);

  if (orders.isPending) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const all = orders.data ?? [];
  const live = all.filter(isLive);
  const earlier = all.filter((order) => !isLive(order));
  // "Now" is when the data arrived, not Date.now(): rendering stays pure, and the
  // minutes update together with the statuses on every refetch.
  const now = orders.dataUpdatedAt;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
          gap: 20,
        }}
        // Pull down to check for news now, instead of waiting for the 30 s refresh.
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => {
              setPulling(true);
              orders.refetch().finally(() => setPulling(false));
            }}
          />
        }
      >
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Orders'}
        </ThemedText>

        {orders.isError && (
          <ThemedText color="ink2">
            {'We couldn’t load your orders. Pull down to try again.'}
          </ThemedText>
        )}

        {all.length === 0 && !orders.isError && (
          <View style={{ gap: 16, marginTop: 24, alignItems: 'center' }}>
            <ThemedText color="ink2" style={{ textAlign: 'center' }}>
              {'No orders yet. When you order, you’ll see it here until it reaches you.'}
            </ThemedText>
            <Button size="small" onPress={() => router.navigate('/')}>
              {'Find a café'}
            </Button>
          </View>
        )}

        {live.map((order) => {
          const left = minutesLeft(order, now);
          return (
            <LiveOrderCard
              key={order.id}
              order={order}
              label="In progress"
              title={order.cafeName}
              detail={STATUS_LABEL[order.status]}
              image={order.cafeImage}
              footer={
                <ThemedText type="subhead" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
                  {left === null
                    ? `Waiting for ${order.cafeName} to accept`
                    : left > 0
                      ? `Arriving at ${readyTime(order)} · in ~${left} min`
                      : `Arriving at ${readyTime(order)} · any moment now`}
                </ThemedText>
              }
            />
          );
        })}

        {earlier.length > 0 && (
          <View style={{ gap: 12, marginTop: live.length > 0 ? 8 : 0 }}>
            <ThemedText type="title" weight="bold" accessibilityRole="header">
              {'Earlier'}
            </ThemedText>
            {earlier.map((order) => (
              <PastOrderRow key={order.id} order={order} />
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
