import { applyOrderUpdate, type Order } from '@shoot/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { type NewSpot, updateSpot } from '@/data/api';
import { getUserLocation } from '@/hooks/use-user-location';

/**
 * Saves a new spot for an order (E10): reads where the phone is now, sends it with the photo
 * or code, puts the updated order in the Orders cache, and opens the order screen.
 */
export function useUpdateSpot(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (delivery: NewSpot['delivery']) =>
      updateSpot(orderId, { coordinates: await getUserLocation(), delivery }),
    onSuccess: (order: Order) => {
      queryClient.setQueryData<Order[]>(['orders'], (orders) => applyOrderUpdate(orders, order));
      router.replace({ pathname: '/order/[id]', params: { id: order.id } });
    },
  });
}
