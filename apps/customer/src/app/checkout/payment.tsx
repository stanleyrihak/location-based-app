import { Button, Icon, ThemedText, ThemedView, Radius, Shadow, useTheme } from '@shoot/ui';
import { Image } from 'expo-image';
import { Redirect, router, Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { PaymentProblem } from '@/components/payment-problem';
import { PriceSummary } from '@/components/price-summary';
import { useNearbyCafe } from '@/data/queries';
import { usePlaceOrder } from '@/data/use-place-order';
import { PaymentCancelledError } from '@/payments/stripe';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';
import { formatPrice } from '@/utils/format';

const GUTTER = 24;

/**
 * 2.7 Checkout: where it goes, what it costs, and the pay button.
 *
 * There's no payment method to choose here. "Pay" opens Stripe's sheet, and the customer picks
 * a card or a wallet there. Without a Stripe key, the server fakes the payment, so "Pay" sends
 * the order at once. If paying fails, the bottom of this screen shows what went wrong.
 */
export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const { spot, photos } = useCheckout();
  const placeOrder = usePlaceOrder();

  // Neither a code nor photos (say, after a reload in development): prove the spot first.
  if (!spot && !photos) {
    return <Redirect href="/checkout/spot" />;
  }

  const deliveryFeeCents = cafe?.deliveryFeeCents ?? 0;
  const total = cart.subtotalCents + deliveryFeeCents;
  // Closing Stripe's sheet isn't a failure, so it never shows a message (see onError below).
  const failed = placeOrder.isError && !(placeOrder.error instanceof PaymentCancelledError);

  function pay() {
    placeOrder.mutate(undefined, {
      onSuccess: (order) => {
        // Leave checkout completely: back to the tabs, then show the confirmation on top.
        // "Back" from the confirmation can then never return to a paid checkout.
        router.dismissTo('/');
        router.push({ pathname: '/order-sent/[id]', params: { id: order.id } });
        // The order has its own copy of the items, so the cart can go.
        cart.clear();
      },
      onError: (error) => {
        if (error instanceof PaymentCancelledError) placeOrder.reset();
      },
    });
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/*
        While paying, the customer can't leave this screen, by swipe or by the back button.
        The range check and the photo upload run before Stripe's sheet opens, and the result
        must have a screen to come back to.
      */}
      <Stack.Screen options={{ gestureEnabled: !placeOrder.isPending }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: GUTTER,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <CheckoutHeader title="Checkout" backLabel="Back" backDisabled={placeOrder.isPending} />
        <CheckoutSteps current={3} />

        <SpotCard
          image={photos?.spot}
          title={spot ? spot.label : `Your spot near ${cafe?.name ?? 'the café'}`}
          doneText={spot ? 'Spot code scanned' : 'Photo added'}
          changeDisabled={placeOrder.isPending}
        />

        <View style={{ marginTop: 12 }}>
          <PriceSummary
            variant="card"
            subtotalCents={cart.subtotalCents}
            deliveryFeeCents={deliveryFeeCents}
            totalLabel={`Pay ${cafe?.name ?? 'the café'}`}
          />
        </View>
      </ScrollView>

      <View style={{ paddingTop: 12, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 8 }}>
        {failed ? (
          // reset() clears the error, so the pay button comes back.
          <PaymentProblem error={placeOrder.error} cafe={cafe} onReset={() => placeOrder.reset()} />
        ) : (
          <Button onPress={pay} loading={placeOrder.isPending}>
            {placeOrder.isPending ? 'Paying…' : `Pay ${formatPrice(total)}`}
          </Button>
        )}
      </View>
    </ThemedView>
  );
}

/** "Deliver to" with the spot photo (`.spot-card`). "Change" goes back to 2.3. */
function SpotCard({
  image,
  title,
  doneText,
  changeDisabled,
}: {
  image: string | number | undefined;
  title: string;
  doneText: string;
  /** True while paying: the spot can't change under a payment that's running. */
  changeDisabled: boolean;
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
        disabled={changeDisabled}
        // Back to 2.3, closing every checkout screen above it.
        onPress={() => router.dismissTo('/checkout/spot')}
      >
        {'Change'}
      </Button>
    </View>
  );
}
