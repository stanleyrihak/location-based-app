import { Button, Icon, type IconName, Radius, ThemedText, useTheme } from '@shoot/ui';
import { router, Stack } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentMark } from '@/components/payment-mark';
import { PriceSummary } from '@/components/price-summary';
import {
  CafePausedError,
  PaymentDeclinedError,
  PriceChangedError,
  SoldOutError,
  SpotNotValidError,
} from '@/data/api';
import { type NearbyCafe, useNearbyCafe } from '@/data/queries';
import { OutOfRangeError, useCheckRange } from '@/data/use-check-range';
import { usePlaceOrder } from '@/data/use-place-order';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';
import { formatDistance } from '@/utils/format';

/**
 * 2.8 The payment sheet, as a form sheet over 2.7. A neutral stand-in for the Apple Pay /
 * Google Pay sheet, not a copy of it: the real one is drawn by the system and comes with Stripe.
 * When paying fails, the same sheet shows E7 instead, and E1 when you've walked out of range.
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

      {placeOrder.error instanceof OutOfRangeError && cafe ? (
        <MovedOutOfRange cafe={cafe} onBackInRange={() => placeOrder.reset()} />
      ) : placeOrder.error instanceof SoldOutError ? (
        <SoldOutWhilePaying itemIds={placeOrder.error.itemIds} />
      ) : placeOrder.isError ? (
        <PaymentFailed
          reason={
            placeOrder.error instanceof PaymentDeclinedError
              ? 'declined'
              : placeOrder.error instanceof CafePausedError
                ? 'paused'
                : placeOrder.error instanceof SpotNotValidError
                  ? 'spot'
                  : placeOrder.error instanceof PriceChangedError
                    ? 'prices'
                    : 'other'
          }
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
            loading={placeOrder.isPending}
            style={{ marginTop: 4 }}
          >
            {placeOrder.isPending ? 'Paying…' : 'Confirm payment'}
          </Button>
        </>
      )}
    </View>
  );
}

/** E7 Payment failed. Nothing was charged, and the cart and photo are still there. */
const FAILURE_TEXT = {
  declined:
    'You haven’t been charged. Your cart and photo are saved. Try again, or choose another payment method.',
  paused:
    'The café isn’t taking orders right now. You haven’t been charged. Your cart is saved, so you can try again in a moment.',
  prices:
    'The café changed a price since you added it. You haven’t been charged. Your cart has today’s prices now: check the total and pay again.',
  spot: 'The code at your spot isn’t valid any more. You haven’t been charged. Go back to your cart and choose your spot again.',
  other:
    'Something went wrong while sending your order. You haven’t been charged. Your cart and photo are saved, so you can try again.',
};

function PaymentFailed({
  reason,
  onTryAgain,
}: {
  reason: keyof typeof FAILURE_TEXT;
  onTryAgain: () => void;
}) {
  return (
    <SheetMessage
      icon="x"
      tone="error"
      title={
        reason === 'paused'
          ? 'Orders are paused'
          : reason === 'prices'
            ? 'Prices changed'
            : reason === 'spot'
              ? 'Choose your spot again'
              : 'Payment failed'
      }
      text={FAILURE_TEXT[reason]}
    >
      {/* reset() clears the error, so the sheet shows the payment details again. */}
      <Button onPress={onTryAgain}>{'Try again'}</Button>
      <Button variant="secondary" onPress={() => router.dismissTo('/checkout/cart')}>
        {'Back to cart'}
      </Button>
    </SheetMessage>
  );
}

/**
 * E1 Moved out of range. Paying was stopped before any charge. The distance updates by itself:
 * the range check wrote the new position into the cache, and `cafe` is computed from it.
 */
function MovedOutOfRange({ cafe, onBackInRange }: { cafe: NearbyCafe; onBackInRange: () => void }) {
  const checkRange = useCheckRange();
  const [checking, setChecking] = useState(false);

  async function checkAgain() {
    setChecking(true);
    try {
      const { inRange } = await checkRange(cafe);
      // Back in range: show the payment details again. Paying is still the user's choice,
      // so this doesn't charge by itself.
      if (inRange) onBackInRange();
    } catch {
      // No position right now. Stay on this sheet, so the user can try again.
    } finally {
      setChecking(false);
    }
  }

  return (
    <SheetMessage
      icon="pin-alert"
      tone="warning"
      title="You’ve moved out of range"
      text={`${cafe.name} delivers within ${formatDistance(cafe.radiusM)}. You’re now ${formatDistance(cafe.distanceM)} away. Move closer to order. Your cart is saved.`}
    >
      <Button onPress={checkAgain} loading={checking}>
        {'I’ve moved closer, check again'}
      </Button>
      {/* Closes checkout. The cart lives above it (in the root layout), so it stays. */}
      <Button variant="secondary" onPress={() => router.dismissTo('/')}>
        {'Back to café list'}
      </Button>
    </SheetMessage>
  );
}

/**
 * E6 at the last moment: the cart was checked on 2.2, but something sold out while the user
 * was taking photos. The server refused the order before charging anything.
 */
function SoldOutWhilePaying({ itemIds }: { itemIds: string[] }) {
  const cart = useCart();
  const names = cart.lines
    .filter((line) => itemIds.includes(line.item.id))
    .map((line) => line.item.name)
    .join(', ');

  return (
    <SheetMessage
      icon="alert"
      tone="warning"
      title="Something just sold out"
      text={`${names || 'An item'} sold out while you were ordering. You haven’t been charged. Remove it from your cart, then try again.`}
    >
      <Button
        onPress={() => {
          cart.removeItems(itemIds);
          // If nothing is left, the cart screen shows its empty state with a way back.
          router.dismissTo('/checkout/cart');
        }}
      >
        {'Remove it and go to cart'}
      </Button>
    </SheetMessage>
  );
}

/** The layout E1, E6 and E7 share: an icon in a ring, a title, a short text and the buttons. */
function SheetMessage({
  icon,
  tone,
  title,
  text,
  children,
}: {
  icon: IconName;
  tone: 'error' | 'warning';
  title: string;
  text: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View accessibilityRole="alert" style={{ gap: 14, paddingHorizontal: 4 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 2,
          borderColor: theme[tone],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size="xl" color={tone} />
      </View>
      <ThemedText type="title" weight="bold" accessibilityRole="header">
        {title}
      </ThemedText>
      <ThemedText color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
        {text}
      </ThemedText>
      <View style={{ gap: 12, marginTop: 4 }}>{children}</View>
    </View>
  );
}
