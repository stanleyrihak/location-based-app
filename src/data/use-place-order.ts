import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createOrder } from '@/data/api';
import { useNearbyCafe } from '@/data/queries';
import type { NewOrder } from '@/data/types';
import { OutOfRangeError, useCheckRange } from '@/data/use-check-range';
import { pay } from '@/payments/pay';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';

/**
 * Pays, then places the order, as one React Query mutation.
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

  return useMutation({
    mutationFn: async () => {
      if (!cafe || cart.lines.length === 0) {
        throw new Error('The order is missing its café or items.');
      }

      // E1: you may have walked away since choosing the café. Check before charging anything.
      const { inRange, here } = await checkRange(cafe);
      if (!inRange) {
        throw new OutOfRangeError();
      }

      let delivery: NewOrder['delivery'];
      if (spot) {
        delivery = { kind: 'spot', spotLabel: spot.label };
      } else if (photos) {
        // Where you were when paying, so the courier can head there.
        delivery = { kind: 'photos', ...photos, coordinates: here };
      } else {
        throw new Error('The order is missing its spot.');
      }

      const order: NewOrder = {
        cafeId: cafe.id,
        cafeName: cafe.name,
        cafeImage: cafe.image,
        lines: cart.lines.map(({ item, quantity }) => ({
          itemId: item.id,
          name: item.name,
          priceCents: item.priceCents,
          quantity,
          image: item.image,
          section: item.section,
        })),
        note: cart.note.trim(),
        subtotalCents: cart.subtotalCents,
        deliveryFeeCents: cafe.deliveryFeeCents,
        totalCents: cart.subtotalCents + cafe.deliveryFeeCents,
        delivery,
        paymentLabel: paymentMethod.shortLabel,
        readyInMin: cafe.readyInMin,
      };

      // Pay first: if the bank says no, no order is created and nothing is charged.
      await pay(order.totalCents, paymentMethod);
      return createOrder(order);
    },
    // The Orders tab's list is now out of date. Marking it stale makes it reload next time.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}
