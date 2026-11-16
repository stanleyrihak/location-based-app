import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CafeCard } from '@/components/cafe-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type NearbyCafe, useNearbyCafes } from '@/data/queries';
import { useOnboarding } from '@/providers/onboarding-provider';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resetOnboarding } = useOnboarding();
  const { cafes, error, retry } = useNearbyCafes();

  // No data yet: either it failed, or it's still loading.
  if (cafes === undefined) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 }}
      >
        {error ? (
          <>
            <ThemedText type="body" style={{ textAlign: 'center' }}>
              {`Couldn’t load cafés. ${error.message}`}
            </ThemedText>
            <Button onPress={retry}>{'Try again'}</Button>
          </>
        ) : (
          <ActivityIndicator />
        )}
      </ThemedView>
    );
  }

  const inRange = cafes.filter((cafe) => cafe.inRange);
  const outOfRange = cafes.filter((cafe) => !cafe.inRange);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          gap: 8,
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}
      >
        <ThemedText type="headline">{'Cafés near you'}</ThemedText>

        <View style={{ gap: 24, marginTop: 16 }}>
          <CafeGroup title="In range · can deliver to you" cafes={inRange} />
          <CafeGroup title="Out of range · browse only" cafes={outOfRange} />
        </View>

        <Button variant="text" size="small" onPress={resetOnboarding} style={{ marginTop: 32 }}>
          {'Reset onboarding'}
        </Button>
      </ScrollView>
    </ThemedView>
  );
}

function CafeGroup({ title, cafes }: { title: string; cafes: NearbyCafe[] }) {
  // An empty group would just be a heading with nothing under it.
  if (cafes.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <ThemedText type="label" color="ink2" accessibilityRole="header">
        {title}
      </ThemedText>
      {cafes.map((cafe) => (
        <CafeCard
          key={cafe.id}
          cafe={cafe}
          onPress={() => router.push({ pathname: '/cafe/[id]', params: { id: cafe.id } })}
        />
      ))}
    </View>
  );
}
