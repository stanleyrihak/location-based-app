import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCheckout } from '@/providers/checkout-provider';

/** Placeholder for 2.7 Payment method. Built in phase 4. */
export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { spot } = useCheckout();

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 24, gap: 16 }}>
        <CheckoutHeader title="Payment" backLabel="Back to confirm your spot" />
        <CheckoutSteps current={3} />
        <ThemedText color="ink2">
          {spot ? `Delivering to: ${spot.label}` : 'Delivering to the spot in your photo'}
        </ThemedText>
        <ThemedText color="ink2">{'Coming in phase 4.'}</ThemedText>
      </View>
    </ThemedView>
  );
}
