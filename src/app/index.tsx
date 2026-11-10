import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText type="body">Inter 400</ThemedText>
      <ThemedText type="caption">Inter 500</ThemedText>
      <ThemedText type="title">Inter 600</ThemedText>
      <ThemedText type="headline">Inter 700</ThemedText>
    </ThemedView>
  );
}
