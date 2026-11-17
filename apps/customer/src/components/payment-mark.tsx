import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PaymentMethod } from '@/payments/payment-methods';

/** The small badge before a method: dark for the wallet, sand for cards (`.pay-mark`). */
export function PaymentMark({ method }: { method: PaymentMethod }) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 44,
        height: 30,
        borderRadius: Radius.xs,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: method.isWallet ? theme.ink : theme.surface2,
      }}
    >
      <Icon name={method.icon} size="md" color={method.isWallet ? 'inkInverse' : 'ink'} />
    </View>
  );
}
