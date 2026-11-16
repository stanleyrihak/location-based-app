import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/** Placeholder for 2.9 Order sent. Built in phase 5. */
export default function OrderSentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
      <ThemedText type="headline" accessibilityRole="header">
        {'Order sent'}
      </ThemedText>
      <ThemedText color="ink2">{`Order ${id}. The confirmation screen comes in phase 5.`}</ThemedText>
      <View>
        <Button onPress={() => router.back()}>{'Done'}</Button>
      </View>
    </ThemedView>
  );
}
