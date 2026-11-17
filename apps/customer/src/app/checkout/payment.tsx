import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { Icon } from '@/components/icon';
import { PaymentMark } from '@/components/payment-mark';
import { PriceSummary } from '@/components/price-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow } from '@/constants/theme';
import { useNearbyCafe } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/payments/payment-methods';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';
import { formatPrice } from '@/utils/format';

const GUTTER = 24;

/** 2.7 Checkout: where it goes, how you pay, what it costs. */
export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const { spot, photos, paymentMethod, setPaymentMethod } = useCheckout();

  // Neither a code nor photos (say, after a reload in development): prove the spot first.
  if (!spot && !photos) {
    return <Redirect href="/checkout/spot" />;
  }

  const deliveryFeeCents = cafe?.deliveryFeeCents ?? 0;
  const total = cart.subtotalCents + deliveryFeeCents;

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
        <CheckoutHeader title="Checkout" backLabel="Back" />
        <CheckoutSteps current={3} />

        <SpotCard
          image={photos?.spot}
          title={spot ? spot.label : `Your spot near ${cafe?.name ?? 'the café'}`}
          doneText={spot ? 'Spot code scanned' : 'Photo added'}
        />

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Payment method"
          style={{ gap: 12, marginTop: 12 }}
        >
          <ThemedText type="title" weight="bold" accessibilityRole="header">
            {'Payment method'}
          </ThemedText>
          {PAYMENT_METHODS.map((method) => (
            <PaymentOption
              key={method.id}
              method={method}
              selected={method.id === paymentMethod.id}
              onSelect={() => setPaymentMethod(method)}
            />
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <PriceSummary
            variant="card"
            subtotalCents={cart.subtotalCents}
            deliveryFeeCents={deliveryFeeCents}
          />
        </View>
      </ScrollView>

      <View style={{ paddingTop: 12, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 8 }}>
        <Button onPress={() => router.push('/checkout/pay-sheet')}>
          {`Pay ${formatPrice(total)} with ${paymentMethod.shortLabel}`}
        </Button>
      </View>
    </ThemedView>
  );
}

/** "Deliver to" with the spot photo (`.spot-card`). "Change" goes back to 2.3. */
function SpotCard({
  image,
  title,
  doneText,
}: {
  image: string | number | undefined;
  title: string;
  doneText: string;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        paddingRight: 16,
        borderRadius: Radius.card,
        backgroundColor: theme.surface,
        boxShadow: Shadow.card,
        marginTop: 4,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: Radius.thumbSm,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surface2,
        }}
      >
        {image !== undefined ? (
          <Image source={image} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        ) : (
          <Icon name="qr" />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText type="label" color="ink2">
          {'Deliver to'}
        </ThemedText>
        <ThemedText weight="bold" style={{ lineHeight: 21 }}>
          {title}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ThemedText type="subhead" weight="semibold">
            {doneText}
          </ThemedText>
          <Icon name="check" size="sm" color="success" bold />
        </View>
      </View>
      <Button
        variant="text"
        size="small"
        // Back to 2.3, closing every checkout screen above it.
        onPress={() => router.dismissTo('/checkout/spot')}
      >
        {'Change'}
      </Button>
    </View>
  );
}

/** One payment method as a radio row (`.option`). The selected one gets a dark outline. */
function PaymentOption({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={method.label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 56,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: Radius.input,
        backgroundColor: theme.surface,
        borderWidth: 2,
        borderColor: selected ? theme.ink : 'transparent',
      }}
    >
      <PaymentMark method={method} />
      <ThemedText weight={method.isWallet ? 'semibold' : 'regular'} style={{ flex: 1 }}>
        {method.label}
      </ThemedText>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? theme.ink : theme.lineStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.ink }} />
        )}
      </View>
    </Pressable>
  );
}
