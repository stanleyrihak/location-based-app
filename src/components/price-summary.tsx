import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/utils/format';

type Props = {
  subtotalCents: number;
  deliveryFeeCents: number;
};

/** Subtotal, delivery and total (`.summary.plain`). Used on the cart and the payment screen. */
export function PriceSummary({ subtotalCents, deliveryFeeCents }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.line }}>
      <Line label="Subtotal" value={formatPrice(subtotalCents)} />
      <Line label="Delivery" value={formatPrice(deliveryFeeCents)} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <ThemedText weight="bold" style={TOTAL}>
          {'Total'}
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
