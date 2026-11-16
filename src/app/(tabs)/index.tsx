import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CafeCard } from '@/components/cafe-card';
import { Chip } from '@/components/chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CAFE_FILTERS, type CafeFilterId, filterCafes } from '@/data/cafe-filters';
import { type NearbyCafe, useNearbyCafes } from '@/data/queries';
import { useOnboarding } from '@/providers/onboarding-provider';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resetOnboarding } = useOnboarding();
  const { cafes, errorMessage, retry } = useNearbyCafes();
  // Hooks run on every render in the same order, so this sits above the early return.
  const [filter, setFilter] = useState<CafeFilterId>('all');

  // No data yet: either it failed, or it's still loading.
  if (cafes === undefined) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 }}
      >
        {errorMessage ? (
          <>
            <ThemedText type="body" style={{ textAlign: 'center' }}>
              {errorMessage}
            </ThemedText>
            <Button onPress={retry}>{'Try again'}</Button>
          </>
        ) : (
          <ActivityIndicator />
        )}
      </ThemedView>
    );
  }

  // Derived during render from `cafes` and `filter`, never stored in state,
  // so it can't fall out of sync when the cafés reload.
  const visible = filterCafes(cafes, filter, new Date());
  const inRange = visible.filter((cafe) => cafe.inRange);
  const outOfRange = visible.filter((cafe) => !cafe.inRange);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          gap: 8,
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
        }}
      >
        <ThemedText type="headline">{'Cafés near you'}</ThemedText>

        <FilterChips selected={filter} onSelect={setFilter} />

        <View style={{ gap: 24, marginTop: 16 }}>
          <CafeGroup title="In range · can deliver to you" cafes={inRange} />
          <CafeGroup title="Out of range · browse only" cafes={outOfRange} />
          {visible.length === 0 && (
            <ThemedText type="body" color="ink2" style={{ textAlign: 'center' }}>
              {'No cafés match this filter.'}
            </ThemedText>
          )}
        </View>

        <Button variant="text" size="small" onPress={resetOnboarding} style={{ marginTop: 32 }}>
          {'Reset onboarding'}
        </Button>
      </ScrollView>
    </ThemedView>
  );
}

const GUTTER = 24;

function FilterChips({
  selected,
  onSelect,
}: {
  selected: CafeFilterId;
  onSelect: (id: CafeFilterId) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Filter"
      // Pull the row out to the screen edges, then pad the content back in,
      // so chips scroll to the edge but the first one lines up with the heading.
      style={{ marginHorizontal: -GUTTER, marginTop: 16, flexGrow: 0 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: GUTTER }}
    >
      {CAFE_FILTERS.map(({ id, label }) => (
        <Chip key={id} label={label} selected={id === selected} onPress={() => onSelect(id)} />
      ))}
    </ScrollView>
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
