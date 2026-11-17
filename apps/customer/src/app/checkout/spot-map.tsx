import { Button, ThemedText } from '@shoot/ui';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrivacyNote } from '@/components/privacy-note';
import { SpotMap } from '@/components/spot-map';
import { useNearbyCafe } from '@/data/queries';
import { useUserLocation } from '@/hooks/use-user-location';
import { useCart } from '@/providers/cart-provider';
import { formatDistance } from '@/utils/format';

/**
 * 2.3b Your spot, as a native form sheet over 2.3 (set up in checkout/_layout.tsx).
 * The sheet sizes itself to this content ('fitToContents'), so nothing here uses flex: 1.
 */
export default function SpotMapSheet() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  // Same query as on Home, so this is read from the cache, not fetched again.
  const location = useUserLocation();

  if (!cafe) {
    return null;
  }

  const distance = formatDistance(cafe.distanceM);
  const radius = formatDistance(cafe.radiusM);
  const summary = cafe.inRange
    ? `${distance} from ${cafe.name}, inside its ${radius} delivery area.`
    : `${distance} from ${cafe.name}, outside its ${radius} delivery area.`;

  return (
    <View
      style={{ paddingTop: 28, paddingHorizontal: 20, paddingBottom: insets.bottom + 8, gap: 14 }}
    >
      <ThemedText type="title" weight="bold" accessibilityRole="header">
        {'Your spot'}
      </ThemedText>
      <ThemedText color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
        {summary}
      </ThemedText>
      <SpotMap
        cafe={cafe.coordinates}
        user={location.data}
        radiusM={cafe.radiusM}
        accessibilityLabel={`Map: ${summary}`}
      />
      <PrivacyNote lead={`Only ${cafe.name} sees your location,`} text="and only until delivery." />
      <Button onPress={() => router.back()} style={{ marginTop: 4 }}>
        {'Done'}
      </Button>
    </View>
  );
}
