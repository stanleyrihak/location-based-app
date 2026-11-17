import type { Cafe, Coordinates } from '@shoot/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type Seller, updateCafe } from '@/data/api';

/**
 * "Pause orders" and "Sell from here". The café the server saved goes into the signed-in
 * seller's details, so the Stand tab and the order maps show it at once.
 */
export function useUpdateCafe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: { isPaused?: boolean; coordinates?: Coordinates }) => updateCafe(changes),
    onSuccess: (cafe: Cafe) => {
      queryClient.setQueryData<Seller>(['seller-me'], (seller) =>
        seller ? { ...seller, cafe } : seller,
      );
    },
  });
}
