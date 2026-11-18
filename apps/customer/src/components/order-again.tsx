import { orderToRepeat } from '@shoot/shared';
import { Button, ThemedText, Radius, Shadow, useTheme } from '@shoot/ui';
import { View } from 'react-native';

import { orderContents } from '@/data/order-format';
import { type NearbyCafe, useOrders } from '@/data/queries';
import { useOrderAgain } from '@/data/use-order-again';
import { formatPrice } from '@/utils/format';

/**
 * "Order again" on Home (1.6): your latest finished order from a café that can deliver to you now.
 * Renders nothing when there is none, so Home looks the same as before your first order.
 */
export function OrderAgain({ cafes }: { cafes: NearbyCafe[] }) {
  const theme = useTheme();
  const orders = useOrders();
  const orderAgain = useOrderAgain();

  const order = orderToRepeat(
    orders.data ?? [],
    cafes.filter((cafe) => cafe.inRange).map((cafe) => cafe.id),
  );
  if (!order) {
    return null;
  }

  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <ThemedText type="label" color="ink2" accessibilityRole="header">
        {'Order again'}
      </ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 14,
          paddingLeft: 16,
          paddingRight: 12,
          borderRadius: Radius.card,
          backgroundColor: theme.surface,
          boxShadow: Shadow.card,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText weight="bold">{order.cafeName}</ThemedText>
          <ThemedText type="subhead" color="ink2" numberOfLines={2}>
            {orderContents(order)}
          </ThemedText>
          <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
            {formatPrice(order.totalCents)}
          </ThemedText>
        </View>
        <Button size="small" onPress={() => orderAgain(order)}>
          {'Order again'}
        </Button>
      </View>
    </View>
  );
}
