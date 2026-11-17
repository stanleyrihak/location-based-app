import { Button, Icon, ThemedText, ThemedView, useTheme } from '@shoot/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveOrderCard } from '@/components/order-card';
import { minutesLeft, readyTime, STATUS_LABEL, stepOf } from '@/data/order-format';
import { useOrders } from '@/data/queries';

/** 2.9 Order sent: a short success moment, and the order already on its way. */
export default function OrderSentScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  // Read from the orders list: paying marked it stale, so it reloads with the new order in it.
  const orders = useOrders();
  const order = orders.data?.find((candidate) => candidate.id === id);
  // The time the screen opened, read once (Date.now() in render isn't allowed).
  const [openedAt] = useState(() => Date.now());

  if (!order) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const byPhoto = order.delivery.kind === 'photos';

  return (
    <ThemedView
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 8,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        {/*
          Layout animations: `entering` plays once when the view appears. Reanimated skips
          them when the phone has Reduce Motion on.
        */}
        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Order sent"
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.success,
          }}
        >
          <Icon name="check" size="thumb" color="onSuccess" bold />
        </Animated.View>

        <ThemedText type="display" accessibilityRole="header" style={{ marginTop: 8 }}>
          {'Order sent!'}
        </ThemedText>
        <ThemedText color="ink2" style={{ textAlign: 'center' }}>
          {`Stay where you are. ${order.cafeName} will bring it to you.`}
        </ThemedText>

        <Animated.View
          entering={FadeInDown.delay(250)}
          style={{ alignSelf: 'stretch', marginTop: 20 }}
        >
          <LiveOrderCard
            order={order}
            label={STATUS_LABEL[order.status]}
            title={
              byPhoto ? `${order.cafeName} has your photo` : `${order.cafeName} knows your spot`
            }
            image={order.delivery.kind === 'photos' ? order.delivery.spot : order.cafeImage}
            header={
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
                {/* Until the café accepts there's no ready time yet: it starts at accept. */}
                {order.readyAt === null ? (
                  <ThemedText weight="semibold">{`Waiting for ${order.cafeName} to accept`}</ThemedText>
                ) : (
                  <>
                    <ThemedText type="headlineLarge" style={{ fontVariant: ['tabular-nums'] }}>
                      {`~${minutesLeft(order, openedAt)} min`}
                    </ThemedText>
                    <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
                      {`at ${readyTime(order)}`}
                    </ThemedText>
                  </>
                )}
                <ThemedText type="caption" color="ink2" style={{ marginLeft: 'auto' }}>
                  {`Step ${stepOf(order.status)} of 4`}
                </ThemedText>
              </View>
            }
          />
        </Animated.View>
      </View>

      <Button
        // Close this screen (the tabs are under it), then switch to the Orders tab,
        // where this order now sits at the top.
        onPress={() => {
          router.back();
          router.navigate('/orders');
        }}
      >
        {'See your order'}
      </Button>
      <Button variant="text" onPress={() => router.back()} style={{ marginTop: 4 }}>
        {'Back to cafés'}
      </Button>
    </ThemedView>
  );
}
