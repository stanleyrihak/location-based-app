import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  confirmOrder,
  getMenu,
  PaymentDeclinedError,
  type PlaceOrderInput,
  PriceChangedError,
  startOrder,
} from '@/data/api';
import { useNearbyCafe } from '@/data/queries';
import { OutOfRangeError, useCheckRange } from '@/data/use-check-range';
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
  const { spot, photos, paymentMethod } = useCheckout();
  const checkRange = useCheckRange();
  /**
   * The order started by an earlier try that didn't finish. "Try again" then only repeats
   * step 2 for it, instead of starting a second order with a second reservation.
   * A ref, not state: it's bookkeeping between tries, nothing on screen depends on it.
   */
  const startedOrderId = useRef<string | null>(null);

  async function confirm(orderId: string) {
    try {
      const order = await confirmOrder(orderId);
      startedOrderId.current = null;
      return order;
    } catch (error) {
      // The card was refused: the next try may use another card, which needs a new payment.
      // Out of range (the stand moved while paying): the server ended that order.
      if (error instanceof PaymentDeclinedError || error instanceof OutOfRangeError) {
        startedOrderId.current = null;
      }
      throw error;
    }
  }

  return useMutation({
    mutationFn: async () => {
      if (startedOrderId.current) {
        return confirm(startedOrderId.current);
      }

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

      const { orderId } = await startOrder({
        cafeId: cafe.id,
        lines: cart.lines.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
        note: cart.note.trim(),
        coordinates: here,
        delivery,
        payment: { methodId: paymentMethod.id, label: paymentMethod.shortLabel },
        expectedTotalCents: cart.subtotalCents + cafe.deliveryFeeCents,
      });
      // Stripe's payment sheet goes here (build step 4), with the clientSecret from startOrder.
      startedOrderId.current = orderId;
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
