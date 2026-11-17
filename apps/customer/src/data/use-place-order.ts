import { useMutation, useQueryClient } from '@tanstack/react-query';

import { placeOrder, type PlaceOrderInput } from '@/data/api';
import { useNearbyCafe } from '@/data/queries';
import { OutOfRangeError, useCheckRange } from '@/data/use-check-range';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';

/**
 * Places the order (the server charges and stores it in one step), as a React Query mutation.
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

      return placeOrder({
        cafeId: cafe.id,
        lines: cart.lines.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
        note: cart.note.trim(),
        coordinates: here,
        delivery,
        payment: { methodId: paymentMethod.id, label: paymentMethod.shortLabel },
      });
    },
    // The Orders tab's list is now out of date. Marking it stale makes it reload next time.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}
