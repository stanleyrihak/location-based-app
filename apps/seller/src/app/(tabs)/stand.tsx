import { Button, ThemedText, ThemedView } from '@shoot/ui';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/providers/session-provider';

/** The café and who is signed in. Pausing orders and moving the stand come in step 3.4. */
export default function StandScreen() {
  const insets = useSafeAreaInsets();
  const { seller, signOut } = useSession();

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 24, gap: 24 }}>
      <ThemedText type="headlineLarge" accessibilityRole="header">
        {'Stand'}
      </ThemedText>
      <View style={{ gap: 4 }}>
        <ThemedText type="title" weight="bold">
          {seller?.cafe.name ?? ' '}
        </ThemedText>
        <ThemedText color="ink2">{seller ? `${seller.name} · ${seller.email}` : ' '}</ThemedText>
      </View>
      <Button variant="secondary" onPress={signOut} style={{ marginTop: 'auto', marginBottom: 24 }}>
        {'Sign out'}
      </Button>
    </ThemedView>
  );
}
