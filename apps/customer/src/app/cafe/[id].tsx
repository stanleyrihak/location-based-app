import { Image } from 'expo-image';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { MenuRow } from '@/components/menu-row';
import { SectionTabs } from '@/components/section-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type NearbyCafe, useMenu, useNearbyCafe } from '@/data/queries';
import type { MenuItem, MenuSection } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/providers/cart-provider';
import { formatClockTime, formatDistance, formatItemCount, formatPrice } from '@/utils/format';

const GUTTER = 24;
const COVER_HEIGHT = 180;

const SECTION_LABELS: Record<MenuSection, string> = {
  coffee: 'Coffee',
  tea: 'Tea',
  pastry: 'Pastry',
  lunch: 'Lunch',
};

export default function CafeMenuScreen() {
  // The [id] in the file name becomes a URL parameter: /cafe/saaripaahtimo gives id "saaripaahtimo".
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cafe, isLoading, errorMessage, retry } = useNearbyCafe(id);

  if (cafe === undefined) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          padding: GUTTER,
        }}
      >
        {isLoading && !errorMessage ? (
          <ActivityIndicator />
        ) : (
          <>
            <ThemedText style={{ textAlign: 'center' }}>
              {errorMessage ?? 'We couldn’t find this café.'}
            </ThemedText>
            {errorMessage && <Button onPress={retry}>{'Try again'}</Button>}
            <Button variant="text" onPress={() => router.back()}>
              {'Back to cafés'}
            </Button>
          </>
        )}
      </ThemedView>
    );
  }

  // A separate component, so its hooks only run once the café is known.
  return <CafeMenu cafe={cafe} />;
}

function CafeMenu({ cafe }: { cafe: NearbyCafe }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const menu = useMenu(cafe.id);
  const cart = useCart();
  // Light status bar text over the dark top of the photo, only while this screen is on top.
  const isFocused = useIsFocused();
  const [pastCover, setPastCover] = useState(false);
  // The cart's café, for the "Start a new cart?" question.
  const { cafe: cartCafe } = useNearbyCafe(cart.cafeId ?? '');

  // null means "the first section", which isn't known until the menu loads.
  const [pickedSection, setPickedSection] = useState<MenuSection | null>(null);

  const items = menu.data ?? [];
  // Only sections with something in them get a tab, in the café's own order.
  const sections = [...new Set(items.map((item) => item.section))];
  const section = pickedSection ?? sections[0];
  const visible = items.filter((item) => item.section === section);

  const cartIsHere = cart.cafeId === cafe.id && cart.itemCount > 0;

  function blockedReason(item: MenuItem) {
    if (item.soldOut) return `${item.name} is sold out`;
    if (!cafe.inRange) return `Can’t add ${item.name}: you’re out of delivery range`;
    return undefined;
  }

  function handleAdd(item: MenuItem) {
    const otherCafe = cart.cafeId !== null && cart.cafeId !== item.cafeId;
    if (!otherCafe) {
      cart.add(item);
      return;
    }
    // One café per cart. There's no design for this, so it's the native alert.
    Alert.alert(
      'Start a new cart?',
      `Your cart from ${cartCafe?.name ?? 'another café'} will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start new cart', style: 'destructive', onPress: () => cart.add(item) },
      ],
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Light text over the photo, dark again once the photo has scrolled away. */}
      {isFocused && <StatusBar style={pastCover ? 'dark' : 'light'} />}
      <ScrollView
        // Tells us how far the menu has scrolled, at most once per frame (16 ms).
        scrollEventThrottle={16}
        onScroll={(event) => {
          const past = event.nativeEvent.contentOffset.y > COVER_HEIGHT;
          // Only set state when it changes, not on every scroll event.
          if (past !== pastCover) setPastCover(past);
        }}
        contentContainerStyle={{
          paddingBottom: (cartIsHere ? 96 : 24) + insets.bottom,
        }}
      >
        <View style={{ height: COVER_HEIGHT + insets.top, backgroundColor: theme.surface2 }}>
          <Image source={cafe.coverImage} contentFit="cover" style={{ flex: 1 }} />
          {/* Darkens the top of the photo so the status bar stays readable. */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 24,
              backgroundImage: 'linear-gradient(rgba(74, 44, 30, 0.55), transparent)',
            }}
          />
        </View>

        <View style={{ paddingHorizontal: GUTTER, paddingTop: 20, gap: 16 }}>
          <MenuHeader cafe={cafe} />

          {!cafe.inRange && (
            <Banner
              tone="warn"
              title="You’re out of delivery range"
              text={`You can look around. Get within ${formatDistance(cafe.radiusM)} of the café to start ordering.`}
            />
          )}

          {menu.isPending ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : menu.error ? (
            <View style={{ gap: 12, marginTop: 24 }}>
              <ThemedText style={{ textAlign: 'center' }}>
                {'We couldn’t load the menu. Check your connection, then try again.'}
              </ThemedText>
              <Button onPress={() => menu.refetch()}>{'Try again'}</Button>
            </View>
          ) : (
            <>
              <SectionTabs
                tabs={sections.map((id) => ({ id, label: SECTION_LABELS[id] }))}
                selected={section}
                onSelect={setPickedSection}
                gutter={GUTTER}
                accessibilityLabel="Menu"
              />
              <View style={{ marginTop: -8 }}>
                {visible.map((item, index) => (
                  <MenuRow
                    key={item.id}
                    item={item}
                    quantity={cart.quantityOf(item.id)}
                    blockedReason={blockedReason(item)}
                    onAdd={() => handleAdd(item)}
                    isLast={index === visible.length - 1}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/*
        Outside the ScrollView, so it stays at the top while the menu scrolls under it.
        Drawn after the ScrollView, so it sits on top (later siblings draw over earlier ones).
        The design puts it at the bottom of the photo; at the top it's where iOS users
        look for "back", and it matches the cart screen.
      */}
      <IconButton
        icon="back"
        variant="raised"
        accessibilityLabel="Back to cafés"
        onPress={() => router.back()}
        style={{ position: 'absolute', left: GUTTER - 8, top: insets.top + 8 }}
      />

      {cartIsHere && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: GUTTER,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: theme.bg,
          }}
        >
          <Button
            trailing={formatPrice(cart.subtotalCents)}
            onPress={() => router.push('/checkout/cart')}
          >
            {`View cart · ${formatItemCount(cart.itemCount)}`}
          </Button>
        </View>
      )}
    </ThemedView>
  );
}

function MenuHeader({ cafe }: { cafe: NearbyCafe }) {
  // Read the clock once, when the screen opens. Calling Date.now() on every render would
  // make the same render give different results, which React's rules (and the linter) forbid.
  const [openedAt] = useState(() => Date.now());
  const readyAt = new Date(openedAt + cafe.readyInMin * 60_000);
  const parts = cafe.inRange
    ? [
        `Ready in ~${cafe.readyInMin} min (${formatClockTime(readyAt)})`,
        `Open until ${cafe.openUntil}`,
      ]
    : [`Delivers within ${formatDistance(cafe.radiusM)}`, `Open until ${cafe.openUntil}`];

  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="headline" accessibilityRole="header">
        {cafe.name}
      </ThemedText>
      {/* Wraps between the parts, never inside one, like the meta lines on Home. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }}>
        <ThemedText type="subhead" weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {`${formatDistance(cafe.distanceM)} away`}
        </ThemedText>
        {parts.map((part) => (
          <ThemedText
            key={part}
            type="subhead"
            color="ink2"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {part}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}
