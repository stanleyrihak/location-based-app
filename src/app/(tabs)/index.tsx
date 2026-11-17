import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CafeCard } from '@/components/cafe-card';
import { Chip } from '@/components/chip';
import { LocationIllustration } from '@/components/location-illustration';
import { OrderAgain } from '@/components/order-again';
import { SearchField } from '@/components/search-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CAFE_FILTERS, type CafeFilterId, filterCafes, searchCafes } from '@/data/cafe-filters';
import { type NearbyCafe, useMenuItems, useNearbyCafes } from '@/data/queries';
import { useOnboarding } from '@/providers/onboarding-provider';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resetOnboarding } = useOnboarding();
  const { cafes, errorMessage, retry } = useNearbyCafes();
  // Hooks run on every render in the same order, so this sits above the early return.
  const [filter, setFilter] = useState<CafeFilterId>('all');
  const [query, setQuery] = useState('');
  // Products of the nearby cafés, so search finds "croissant" too, not only café names.
  const menuItems = useMenuItems(cafes?.map((cafe) => cafe.id));

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
  const visible = searchCafes(filterCafes(cafes, filter, new Date()), query, menuItems.data ?? []);
  const inRange = visible.filter((cafe) => cafe.inRange);
  const outOfRange = visible.filter((cafe) => !cafe.inRange);
  // 3.1: judged on all cafés, not the filtered ones. A filter that hides the close cafés
  // doesn't mean nobody can deliver.
  const noneInRange = cafes.every((cafe) => !cafe.inRange);
  const searching = query.trim() !== '';

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
        <LocationLine />

        <View style={{ marginTop: 8 }}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search cafés or products"
          />
        </View>

        {/* Hidden while searching: then the list should only show what matches. */}
        {!searching && <OrderAgain cafes={cafes} />}

        {!searching && noneInRange && cafes.length > 0 && <NoCafeInRange />}

        <FilterChips selected={filter} onSelect={setFilter} />

        <View style={{ gap: 24, marginTop: 16 }}>
          <CafeGroup title="In range · can deliver to you" cafes={inRange} />
          <CafeGroup
            title={noneInRange ? 'Nearby · browse only' : 'Out of range · browse only'}
            cafes={outOfRange}
          />
          {visible.length === 0 && (
            <ThemedText type="body" color="ink2" style={{ textAlign: 'center' }}>
              {!searching
                ? 'No cafés match this filter.'
                : `No cafés or products match “${query.trim()}”.`}
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

/**
 * "Delivering to your location / Current location" (`.loc-picker`). Display only for now:
 * picking another place needs a map or address search. It has no chevron, because a
 * chevron says "tap me" and nothing would happen.
 */
function LocationLine() {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="Cafés near your current location"
      style={{ gap: 2 }}
    >
      <ThemedText type="subhead" color="ink2">
        {'Delivering to your location'}
      </ThemedText>
      <ThemedText type="title" weight="bold">
        {'Current location'}
      </ThemedText>
    </View>
  );
}

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

/** 3.1 No café in range: the cafés are still listed below, to browse. */
function NoCafeInRange() {
  return (
    <View style={{ alignItems: 'center', gap: 12, marginTop: 24 }}>
      <LocationIllustration accessibilityLabel="You are outside every café’s delivery area" />
      <ThemedText
        type="title"
        weight="bold"
        accessibilityRole="header"
        style={{ textAlign: 'center', marginTop: 8 }}
      >
        {'No café can deliver here yet'}
      </ThemedText>
      <ThemedText color="ink2" style={{ textAlign: 'center' }}>
        {
          'Cafés deliver only within a short walk. Move closer to one of the cafés below to start ordering.'
        }
      </ThemedText>
    </View>
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
