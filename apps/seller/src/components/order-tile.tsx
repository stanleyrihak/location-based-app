import { isEndedStatus, type Order } from '@shoot/shared';
import { Icon, Radius, Shadow, ThemedText, useTheme } from '@shoot/ui';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Countdown } from '@/components/countdown';
import { ago, formatPrice, itemCount } from '@/utils/format';

/** How a finished order ended, next to its time, so the list says what happened to it. */
const ENDED: Partial<Record<Order['status'], string>> = {
  delivered: 'Delivered',
  declined: 'Declined',
  expired: 'Not accepted',
  cancelled: 'Cancelled',
};

type Props = {
  order: Order;
  now: number;
  onPress: () => void;
  /** Buttons under the order, for new ones: Accept and Decline. */
  actions?: ReactNode;
};

/**
 * One order in the queue: number, what's in it, how the customer is found, and how long
 * it has been waiting (or, for a new one, how long is left to accept).
 */
export function OrderTile({ order, now, onPress, actions }: Props) {
  const theme = useTheme();
  const isNew = order.status === 'received';
  const byPhoto = order.delivery.kind === 'photos';

  return (
    <View
      style={{
        gap: 12,
        padding: 16,
        borderRadius: Radius.card,
        backgroundColor: theme.surface,
        boxShadow: Shadow.card,
        // New orders get the dark outline the design uses for things that need you now.
        borderWidth: isNew ? 2 : 0,
        borderColor: theme.ink,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Order ${order.number}, ${itemCount(order)}, open`}
        style={{ gap: 6 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <ThemedText type="title" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>
            {`#${order.number}`}
          </ThemedText>
          <ThemedText type="subhead" color="ink2" style={{ flex: 1 }}>
            {`${itemCount(order)} · ${formatPrice(order.totalCents)}`}
          </ThemedText>
          {isNew ? (
            <Countdown order={order} now={now} />
          ) : (
            <ThemedText type="label" color="ink2">
              {ago(order.createdAt, now)}
            </ThemedText>
          )}
        </View>
        <ThemedText numberOfLines={1}>
          {order.lines.map((line) => `${line.quantity} × ${line.name}`).join(', ')}
        </ThemedText>
        {isEndedStatus(order.status) && (
          <ThemedText type="subhead" weight="semibold" color="ink2">
            {ENDED[order.status]}
          </ThemedText>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={byPhoto ? 'camera' : 'qr'} size="sm" color="ink2" />
          <ThemedText type="subhead" color="ink2" numberOfLines={1} style={{ flex: 1 }}>
            {order.delivery.kind === 'spot' ? order.delivery.spotLabel : 'Photos of the customer'}
          </ThemedText>
        </View>
        {order.note !== '' && (
          <ThemedText type="subhead" numberOfLines={2}>{`“${order.note}”`}</ThemedText>
        )}
      </Pressable>
      {actions}
    </View>
  );
}
