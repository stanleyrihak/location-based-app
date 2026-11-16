import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/** Placeholder for 2.3 "Confirm your spot", built in phase 2. */
export default function SpotScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 24, gap: 16 }}>
        <CheckoutHeader title="Confirm your spot" backLabel="Back to cart" />
        <CheckoutSteps current={2} />
        <ThemedText color="ink2">{'Coming in phase 2.'}</ThemedText>
      </View>
    </ThemedView>
  );
}
