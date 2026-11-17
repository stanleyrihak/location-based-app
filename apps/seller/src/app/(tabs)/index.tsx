import { ThemedText, ThemedView } from '@shoot/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** The café's orders. Filled in by the next step of the plan. */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
      <ThemedText type="headlineLarge" accessibilityRole="header">
        {'Orders'}
      </ThemedText>
    </ThemedView>
  );
}
