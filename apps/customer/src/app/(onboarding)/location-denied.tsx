import { Button, ThemedText, ThemedView } from '@shoot/ui';

import { useOnboarding } from '@/providers/onboarding-provider';

export default function LocationDeniedScreen() {
  const { completeOnboarding } = useOnboarding();

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
      <ThemedText type="title">Location denied</ThemedText>
      <Button onPress={completeOnboarding}>{'Next'}</Button>
    </ThemedView>
  );
}
