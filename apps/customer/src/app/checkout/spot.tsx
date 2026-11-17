import { Banner, Button, ThemedText, ThemedView, useTheme } from '@shoot/ui';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { ExamplePhoto } from '@/components/example-photo';
import { PrivacyNote } from '@/components/privacy-note';
import { useNearbyCafe } from '@/data/queries';
import { useCart } from '@/providers/cart-provider';
import { formatDistance } from '@/utils/format';

const GUTTER = 24;

/** 2.3 Confirm your spot: in range? Then prove where you are with photos, or a spot code. */
export default function SpotScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');

  // You may have walked away since opening the menu. Without range, nothing below can work.
  const inRange = cafe?.inRange ?? false;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: GUTTER,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <CheckoutHeader title="Confirm your spot" backLabel="Back to cart" />
        <CheckoutSteps current={2} />

        {cafe &&
          (inRange ? (
            <Banner
              tone="success"
              title="You’re in range"
              text={`${formatDistance(cafe.distanceM)} from ${cafe.name}`}
              action={{ label: 'Map', onPress: () => router.push('/checkout/spot-map') }}
              style={{ marginTop: 4 }}
            />
          ) : (
            <Banner
              tone="warn"
              title="You’re out of delivery range"
              text={`${formatDistance(cafe.distanceM)} from ${cafe.name}. Get within ${formatDistance(cafe.radiusM)} to order.`}
              action={{ label: 'Map', onPress: () => router.push('/checkout/spot-map') }}
              style={{ marginTop: 4 }}
            />
          ))}

        <ThemedText type="title" weight="bold" style={{ marginTop: 12 }}>
          {'Show them it’s you – and where you are'}
        </ThemedText>

        <ExamplePhoto />

        <PrivacyNote
          lead="Your photo is your proof of location."
          text={`Only ${cafe?.name ?? 'the café'} sees it, for this order.`}
        />
      </ScrollView>

      <View
        style={{
          gap: 8,
          paddingTop: 12,
          paddingHorizontal: GUTTER,
          paddingBottom: insets.bottom + 8,
          borderTopWidth: 1,
          borderTopColor: theme.line,
        }}
      >
        <Button disabled={!inRange} onPress={() => router.push('/checkout/photo')}>
          {'Take a photo'}
        </Button>
        <Button variant="text" disabled={!inRange} onPress={() => router.push('/checkout/scan')}>
          {'Or scan the QR code at your spot'}
        </Button>
      </View>
    </ThemedView>
  );
}
