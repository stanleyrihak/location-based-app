import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PaymentMark } from '@/components/payment-mark';
import { PriceSummary } from '@/components/price-summary';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useNearbyCafe } from '@/data/queries';
import { usePlaceOrder } from '@/data/use-place-order';
import { useTheme } from '@/hooks/use-theme';
import { PaymentDeclinedError } from '@/payments/pay';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';

/**
 * 2.8 The payment sheet, as a form sheet over 2.7. A neutral stand-in for the Apple Pay /
 * Google Pay sheet, not a copy of it: the real one is drawn by the system and comes with Stripe.
 * When paying fails, the same sheet shows E7 instead.
 */
export default function PaySheet() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const { paymentMethod } = useCheckout();
  const placeOrder = usePlaceOrder();

  function confirm() {
    placeOrder.mutate(undefined, {
      onSuccess: (order) => {
        // Leave checkout completely: back to the tabs, then show the confirmation on top.
        // "Back" from the confirmation can then never return to a paid checkout.
        router.dismissTo('/');
        router.push({ pathname: '/order-sent/[id]', params: { id: order.id } });
        // The order has its own copy of the items, so the cart can go.
        cart.clear();
      },
    });
  }

  return (
    <View
      style={{ paddingTop: 28, paddingHorizontal: 16, paddingBottom: insets.bottom + 8, gap: 12 }}
    >
      {/* While paying, the sheet can't be swiped away: the result must have somewhere to land. */}
      <Stack.Screen options={{ gestureEnabled: !placeOrder.isPending }} />

      {placeOrder.isError ? (
        <PaymentFailed
          declined={placeOrder.error instanceof PaymentDeclinedError}
          onTryAgain={() => placeOrder.reset()}
        />
      ) : (
        <>
          <Pressable
            onPress={() => router.back()}
            disabled={placeOrder.isPending}
            accessibilityRole="button"
            accessibilityLabel={`${paymentMethod.shortLabel}. Change payment method`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 56,
              paddingHorizontal: 16,
              borderRadius: Radius.input,
              backgroundColor: pressed ? theme.surface2 : theme.surface,
            })}
          >
            <PaymentMark method={paymentMethod} />
            <ThemedText style={{ flex: 1, fontVariant: ['tabular-nums'] }}>
              {paymentMethod.shortLabel}
            </ThemedText>
            <Icon name="chev-r" color="ink2" />
          </Pressable>

          <PriceSummary
            variant="card"
            subtotalCents={cart.subtotalCents}
            deliveryFeeCents={cafe?.deliveryFeeCents ?? 0}
            totalLabel={`Pay ${cafe?.name ?? 'the café'}`}
          />

          <Button
            variant="ink"
            onPress={confirm}
            disabled={placeOrder.isPending}
            style={{ marginTop: 4 }}
          >
            {placeOrder.isPending ? 'Paying…' : 'Confirm payment'}
          </Button>
          {placeOrder.isPending && <ActivityIndicator accessibilityLabel="Paying" />}
        </>
      )}
    </View>
  );
}

/** E7 Payment failed. Nothing was charged, and the cart and photo are still there. */
function PaymentFailed({ declined, onTryAgain }: { declined: boolean; onTryAgain: () => void }) {
  const theme = useTheme();

  return (
    <View accessibilityRole="alert" style={{ gap: 14, paddingHorizontal: 4 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 2,
          borderColor: theme.error,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="x" size="xl" color="error" />
      </View>
      <ThemedText type="title" weight="bold" accessibilityRole="header">
        {'Payment failed'}
      </ThemedText>
      <ThemedText color="ink2">
        {declined
          ? 'You haven’t been charged. Your cart and photo are saved. Try again, or choose another payment method.'
          : 'Something went wrong while sending your order. You haven’t been charged. Your cart and photo are saved, so you can try again.'}
      </ThemedText>
      <View style={{ gap: 12, marginTop: 4 }}>
        {/* reset() clears the error, so the sheet shows the payment details again. */}
        <Button onPress={onTryAgain}>{'Try again'}</Button>
        <Button variant="secondary" onPress={() => router.dismissTo('/checkout/cart')}>
          {'Back to cart'}
        </Button>
      </View>
    </View>
  );
}
