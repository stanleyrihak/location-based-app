import { ThemedText, useTheme } from '@shoot/ui';
import { View } from 'react-native';

import { formatPrice } from '@/utils/format';

type Props = {
  subtotalCents: number;
  deliveryFeeCents: number;
  /** "Total" by default. The payment sheet says who gets the money: "Pay Saaripaahtimo". */
  totalLabel?: string;
  /**
   * `plain`: a line above, no box (`.summary.plain`, the cart footer).
   * `card`: a white box with a line above the total (`.summary`, 2.7 and 2.8).
   */
  variant?: 'plain' | 'card';
};

/** Subtotal, delivery and total. */
export function PriceSummary({
  subtotalCents,
  deliveryFeeCents,
  totalLabel = 'Total',
  variant = 'plain',
}: Props) {
  const theme = useTheme();
  const isCard = variant === 'card';

  return (
    <View
      style={
        isCard
          ? { gap: 8, padding: 16, borderRadius: 20, backgroundColor: theme.surface }
          : { gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.line }
      }
    >
      <Line label="Subtotal" value={formatPrice(subtotalCents)} />
      <Line label="Delivery" value={formatPrice(deliveryFeeCents)} />
      <View
        style={[
          { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
          isCard && { paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.line },
        ]}
      >
        <ThemedText weight="bold" style={[TOTAL, { flexShrink: 1 }]}>
          {totalLabel}
        </ThemedText>
        <ThemedText weight="bold" style={TOTAL}>
          {formatPrice(subtotalCents + deliveryFeeCents)}
        </ThemedText>
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <ThemedText type="subhead" color="ink2">
        {label}
      </ThemedText>
      <ThemedText type="subhead" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
    </View>
  );
}

const TOTAL = { fontSize: 20, lineHeight: 26, fontVariant: ['tabular-nums'] } as const;
