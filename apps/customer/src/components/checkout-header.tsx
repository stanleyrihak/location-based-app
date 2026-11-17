import { ThemedText } from '@shoot/ui';
import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '@/components/icon-button';

type Props = {
  title: string;
  /** What "back" leads to, for VoiceOver: "Back to menu". */
  backLabel: string;
};

/** Back button and big title on one row (`.nav-inline`), used on the checkout screens. */
export function CheckoutHeader({ title, backLabel }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 }}>
      <IconButton
        icon="back"
        accessibilityLabel={backLabel}
        onPress={() => router.back()}
        // Pulls the icon in line with the text below, the circle still gets its full size.
        style={{ marginLeft: -10 }}
      />
      <ThemedText type="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {title}
      </ThemedText>
    </View>
  );
}
