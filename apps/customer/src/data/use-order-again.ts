import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { getMenu } from '@/data/api';
import type { Order } from '@/data/types';
import { type CartLine, useCart } from '@/providers/cart-provider';

/**
 * "Order again": puts a past order back in the cart and opens it (2.2b).
 *
 * It uses today's menu, not the old order: prices may have changed, and something may be
 * sold out. Items that are gone are left out, and the user is told.
 */
export function useOrderAgain() {
  const queryClient = useQueryClient();
  const cart = useCart();

  async function load(order: Order) {
    // query() returns the cached menu if there is a fresh one, or loads it (it replaces
    // the older fetchQuery). The same key as useMenu, so the café screen shares this cache.
    const menu = await queryClient.query({
      queryKey: ['menu', order.cafeId],
      queryFn: () => getMenu(order.cafeId),
    });

    const lines: CartLine[] = [];
    for (const old of order.lines) {
      const item = menu.find((candidate) => candidate.id === old.itemId);
      if (item && !item.soldOut) {
        lines.push({ item, quantity: old.quantity });
      }
    }

    if (lines.length === 0) {
      Alert.alert(
        'Can’t order this again',
        `Nothing from this order is available at ${order.cafeName} right now.`,
      );
      return;
    }

    cart.replace(order.cafeId, lines);
    router.push('/checkout/cart');

    if (lines.length < order.lines.length) {
      Alert.alert('Some items are missing', 'A few things from last time aren’t available today.');
    }
  }

  return (order: Order) => {
    if (cart.itemCount === 0) {
      load(order);
      return;
    }
    // Same rule as on the menu: one cart at a time, so ask before replacing it.
    Alert.alert('Replace your cart?', 'Your current cart will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: () => load(order) },
    ]);
  };
}
