import { Button, Icon, type IconName, ThemedText, useTheme } from '@shoot/ui';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';

import {
  CafePausedError,
  PaymentDeclinedError,
  PriceChangedError,
  SoldOutError,
  SpotNotValidError,
} from '@/data/api';
import type { NearbyCafe } from '@/data/queries';
import { OutOfRangeError, useCheckRange } from '@/data/use-check-range';
import { PaymentsNotSetUpError, StripeSheetError } from '@/payments/stripe';
import { useCart } from '@/providers/cart-provider';
import { formatDistance } from '@/utils/format';

type Props = {
  error: unknown;
  cafe: NearbyCafe | undefined;
  /** Clears the error, so the checkout screen shows the pay button again. */
  onReset: () => void;
};

/**
 * What went wrong when paying, shown at the bottom of 2.7 in place of the pay button:
 * E1 when you've walked out of range, E6 when something sold out, E7 for everything else.
 * The server refuses an order before it charges anything, so every text says nothing was paid.
 */
export function PaymentProblem({ error, cafe, onReset }: Props) {
  if (error instanceof OutOfRangeError && cafe) {
    return <MovedOutOfRange cafe={cafe} onBackInRange={onReset} />;
  }
  if (error instanceof SoldOutError) {
    return <SoldOutWhilePaying itemIds={error.itemIds} />;
  }
  return (
    <PaymentFailed
      reason={
        error instanceof PaymentDeclinedError || error instanceof StripeSheetError
          ? 'declined'
          : error instanceof CafePausedError
            ? 'paused'
            : error instanceof SpotNotValidError
              ? 'spot'
              : error instanceof PriceChangedError
                ? 'prices'
                : error instanceof PaymentsNotSetUpError
                  ? 'setup'
                  : 'other'
      }
      onTryAgain={onReset}
    />
  );
}

/** E7 Payment failed. Nothing was charged, and the cart and photo are still there. */
const FAILURE_TEXT = {
  declined:
    'You haven’t been charged. Your cart and photo are saved. Try again, or choose another payment method.',
  paused:
    'The café isn’t taking orders right now. You haven’t been charged. Your cart is saved, so you can try again in a moment.',
  setup:
    'Payments aren’t set up on the server yet (STRIPE_PUBLISHABLE_KEY is missing). You haven’t been charged.',
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
    <ProblemMessage
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
      <Button onPress={onTryAgain}>{'Try again'}</Button>
      <Button variant="secondary" onPress={() => router.dismissTo('/checkout/cart')}>
        {'Back to cart'}
      </Button>
    </ProblemMessage>
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
      // Back in range: show the pay button again. Paying is still the user's choice,
      // so this doesn't charge by itself.
      if (inRange) onBackInRange();
    } catch {
      // No position right now. Stay on this message, so the user can try again.
    } finally {
      setChecking(false);
    }
  }

  return (
    <ProblemMessage
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
    </ProblemMessage>
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
    <ProblemMessage
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
    </ProblemMessage>
  );
}

/** The layout E1, E6 and E7 share: an icon in a ring, a title, a short text and the buttons. */
function ProblemMessage({
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
    <View accessibilityRole="alert" style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: theme[tone],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size="lg" color={tone} />
        </View>
        <ThemedText type="title" weight="bold" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </ThemedText>
      </View>
      <ThemedText color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
        {text}
      </ThemedText>
      <View style={{ gap: 12, marginTop: 4 }}>{children}</View>
    </View>
  );
}
