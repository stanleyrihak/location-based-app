import type { Order } from '@shoot/shared';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow } from '@/constants/theme';
import { ORDER_STEPS, orderItemCount, shortDate, STATUS_LABEL, stepOf } from '@/data/order-format';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/utils/format';

/** Four bars, filled up to the current step (`.progress`). Green once delivered. */
export function OrderProgress({ order }: { order: Order }) {
  const theme = useTheme();
  const step = stepOf(order.status);
  const fill = order.status === 'delivered' ? theme.success : theme.accent;

  return (
    <View
      accessible
      accessibilityLabel={`Step ${step} of ${ORDER_STEPS.length}: ${STATUS_LABEL[order.status]}`}
      style={{ flexDirection: 'row', gap: 6 }}
    >
      {ORDER_STEPS.map((status, index) => (
        <View
          key={status}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: index < step ? fill : theme.surface2,
          }}
        />
      ))}
    </View>
  );
}

type LiveProps = {
  order: Order;
  /** Small caption on the top left: "Received", "In progress". */
  label: string;
  /** Next to the photo. */
  title: string;
  /** Under the title, for example the status. */
  detail?: string;
  /** Photo on the left: your spot photo, or the café's. */
  image: number | string;
  /** Under the progress bar (2.10), or above it (2.9). */
  footer?: ReactNode;
  header?: ReactNode;
};

/** An order that isn't delivered yet: dark outline, progress bar (`.order-card.live`). */
export function LiveOrderCard({ order, label, title, detail, image, header, footer }: LiveProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        gap: 14,
        padding: 16,
        borderRadius: Radius.card,
        borderWidth: 2,
        borderColor: theme.ink,
        backgroundColor: theme.surface,
        boxShadow: Shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <ThemedText type="caption">{label}</ThemedText>
        <ThemedText type="caption" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
          {`Order #${order.number}`}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Thumb image={image} />
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText weight="bold" style={{ lineHeight: 21 }}>
            {title}
          </ThemedText>
          <ThemedText type="subhead" color="ink2">
            {`${orderItemCount(order)} · to your spot`}
          </ThemedText>
          {detail && (
            <ThemedText type="subhead" weight="semibold">
              {detail}
            </ThemedText>
          )}
        </View>
      </View>
      {header}
      <OrderProgress order={order} />
      {footer}
    </View>
  );
}

/** A delivered order in the "Earlier" list (`.history`). */
export function PastOrderRow({ order }: { order: Order }) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`Order from ${order.cafeName}, ${shortDate(order.createdAt)}, ${orderItemCount(order)}, ${formatPrice(order.totalCents)}, delivered`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        paddingRight: 14,
        borderRadius: Radius.card,
        backgroundColor: theme.surface,
        boxShadow: Shadow.card,
      }}
    >
      <Thumb image={order.cafeImage} />
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText weight="bold">{order.cafeName}</ThemedText>
        <ThemedText type="subhead" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
          {`${shortDate(order.createdAt)} · ${orderItemCount(order)}`}
        </ThemedText>
        <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPrice(order.totalCents)}
        </ThemedText>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          height: 28,
          paddingHorizontal: 12,
          borderRadius: Radius.pill,
          backgroundColor: theme.surface2,
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success }} />
        <ThemedText type="caption" weight="semibold">
          {'Delivered'}
        </ThemedText>
      </View>
    </View>
  );
}

function Thumb({ image }: { image: number | string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: Radius.thumbSm,
        overflow: 'hidden',
        backgroundColor: theme.surface2,
      }}
    >
      <Image source={image} contentFit="cover" style={{ flex: 1 }} />
    </View>
  );
}
