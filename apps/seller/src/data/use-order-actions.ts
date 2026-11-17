import { ApiError, applyOrderUpdate, type DeclineReason, type Order } from '@shoot/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as api from '@/data/api';
import { QUEUE_KEY } from '@/providers/live-orders-provider';

/** What the seller sees when an action fails, in the app's words. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'expired':
        return 'Too late: the 5 minutes ran out. The customer wasn’t charged.';
      case 'payment_failed':
        return 'The payment didn’t go through. Try again, or decline.';
      case 'status_conflict':
        return 'This order already changed.';
      case 'network':
        return 'No connection to the server. Try again.';
    }
    return error.message;
  }
  return 'Something went wrong. Try again.';
}

/**
 * The buttons on an order: accept, decline, on my way, delivered. Each answer from the server
 * is the updated order, which goes straight into the queue's cache, so the screen changes at
 * once (the live connection brings the same change a moment later; applyOrderUpdate keeps the
 * newer one). When the order changed somewhere else first, the queue is fetched again.
 */
export function useOrderActions(orderId: string) {
  const queryClient = useQueryClient();

  function options<T>(run: (input: T) => Promise<Order>) {
    return {
      mutationFn: run,
      onSuccess: (order: Order) => {
        queryClient.setQueryData<Order[]>(QUEUE_KEY, (orders) => applyOrderUpdate(orders, order));
      },
      onError: (error: unknown) => {
        if (
          error instanceof ApiError &&
          (error.code === 'status_conflict' || error.code === 'expired')
        ) {
          void queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
        }
      },
    };
  }

  return {
    accept: useMutation(options<void>(() => api.acceptOrder(orderId))),
    decline: useMutation(options<DeclineReason>((reason) => api.declineOrder(orderId, reason))),
    startDelivery: useMutation(options<void>(() => api.startDelivery(orderId))),
    markDelivered: useMutation(options<void>(() => api.markDelivered(orderId))),
  };
}
