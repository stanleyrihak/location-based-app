import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  confirmOrder,
  getConfig,
  getMenu,
  PaymentDeclinedError,
  type PlaceOrderInput,
  PriceChangedError,
  type ServerConfig,
  startOrder,
} from '@/data/api';
import { CONFIG_KEY, useNearbyCafe } from '@/data/queries';
import { OutOfRangeError, useCheckRange } from '@/data/use-check-range';
import { paymentFor } from '@/payments/payment-methods';
import { payWithStripe } from '@/payments/stripe';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';

/**
 * Places the order in two steps (start: reserve the money; confirm: send it to the café), as
 * one React Query mutation.
 *
 * useQuery is for reading (it runs by itself and caches). useMutation is for changing
 * something on the server: it runs only when you call `mutate`, and tracks
 * isPending / isError / data for that one call, which is exactly what the pay button needs.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const { spot, photos } = useCheckout();
  const checkRange = useCheckRange();
  /**
   * The order started by an earlier try that didn't finish, with its Stripe client secret.
   * "Try again" then repeats only what's left (Stripe's sheet, confirm) for it, instead of
   * starting a second order with a second reservation.
   * A ref, not state: it's bookkeeping between tries, nothing on screen depends on it.
   */
  const started = useRef<{ orderId: string; clientSecret: string | null } | null>(null);

  async function confirm(orderId: string) {
    try {
      const order = await confirmOrder(orderId);
      started.current = null;
      return order;
    } catch (error) {
      // The card was refused: the next try may use another card, which needs a new payment.
      // Out of range (the stand moved while paying): the server ended that order.
      if (error instanceof PaymentDeclinedError || error instanceof OutOfRangeError) {
        started.current = null;
      }
      throw error;
    }
  }

  /** Step 1: checks the range, uploads the photos, and reserves on the server. */
  async function start(config: ServerConfig) {
    if (!cafe || cart.lines.length === 0) {
      throw new Error('The order is missing its café or items.');
    }

    // E1: you may have walked away since choosing the café. The server checks this too,
    // but checking here first saves uploading the photos for nothing.
    const { inRange, here } = await checkRange(cafe);
    if (!inRange) {
      throw new OutOfRangeError();
    }

    let delivery: PlaceOrderInput['delivery'];
    if (spot) {
      delivery = { kind: 'spot', spotCode: spot.code };
    } else if (photos) {
      delivery = { kind: 'photos', selfie: photos.selfie, spot: photos.spot };
    } else {
      throw new Error('The order is missing its spot.');
    }

    return startOrder({
      cafeId: cafe.id,
      lines: cart.lines.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
      note: cart.note.trim(),
      coordinates: here,
      delivery,
      payment: paymentFor(config.payments),
      expectedTotalCents: cart.subtotalCents + cafe.deliveryFeeCents,
    });
  }

  return useMutation({
    mutationFn: async () => {
      const config = await queryClient.fetchQuery({ queryKey: CONFIG_KEY, queryFn: getConfig });
      if (!started.current) {
        started.current = await start(config);
      }
      const { orderId, clientSecret } = started.current;
      // With Stripe: its sheet reserves the money. A closed sheet keeps the order and its
      // client secret, so paying again uses the same PaymentIntent, not a second one.
      if (clientSecret) {
        await payWithStripe(config.stripePublishableKey, clientSecret);
        // Paid: the money is held. If confirming fails now (a network blip), "Try again" only
        // confirms. Stripe won't open its sheet again for a payment that's already done.
        started.current = { orderId, clientSecret: null };
      }
      return confirm(orderId);
    },
    // The Orders tab's list is now out of date. Marking it stale makes it reload next time.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
    onError: async (error) => {
      // The server knows better than this phone's cached café list: the stand may have moved
      // ("Sell from here"). Reload it, so the out-of-range sheet measures from the new spot.
      if (error instanceof OutOfRangeError) {
        await queryClient.invalidateQueries({ queryKey: ['cafes'] });
      }
      // A price changed: the cart takes today's menu, so the total on screen is right.
      if (error instanceof PriceChangedError && cart.cafeId) {
        const cafeId = cart.cafeId;
        const menu = await queryClient.fetchQuery({
          queryKey: ['menu', cafeId],
          queryFn: () => getMenu(cafeId),
          staleTime: 0,
        });
        cart.refreshItems(menu);
      }
    },
  });
}
