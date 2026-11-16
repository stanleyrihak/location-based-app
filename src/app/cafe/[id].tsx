import { router } from 'expo-router';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CafeScreen() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
      <ThemedText type="title">Cafe</ThemedText>
      <Button onPress={() => router.back()}>{'Back'}</Button>
    </ThemedView>
  );
}
