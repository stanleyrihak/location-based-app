import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { PriceSummary } from '@/components/price-summary';
import { ProductThumb } from '@/components/product-thumb';
import { QuantityStepper } from '@/components/quantity-stepper';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getMenu, sellOutForTesting } from '@/data/api';
import { useNearbyCafe } from '@/data/queries';
import type { MenuItem } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { type CartLine, useCart } from '@/providers/cart-provider';
import { formatDistance, formatPrice } from '@/utils/format';

const GUTTER = 24;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const [checking, setChecking] = useState(false);
  // E6: what was taken out because it sold out, so the cart can say so.
  const [soldOut, setSoldOut] = useState<MenuItem[]>([]);

  async function goToCheckout() {
    const cafeId = cart.cafeId;
    if (!cafeId) return;
    setChecking(true);
    try {
      // staleTime 0: ask again, because the menu in the cache may be from before
      // something sold out. Same key as useMenu, so the menu screen gets the news too.
      const menu = await queryClient.query({
        queryKey: ['menu', cafeId],
        queryFn: () => getMenu(cafeId),
        staleTime: 0,
      });
      const gone = cart.lines.filter(
        (line) => !menu.some((item) => item.id === line.item.id && !item.soldOut),
      );
      if (gone.length > 0) {
        // Stay on the cart, so the user sees what changed and the new total before going on.
        cart.removeItems(gone.map((line) => line.item.id));
        setSoldOut((previous) => [...previous, ...gone.map((line) => line.item)]);
        return;
      }
    } catch {
      // Can't check right now. Go on anyway: the café checks again when the order arrives.
    } finally {
      setChecking(false);
    }
    router.push('/checkout/spot');
  }

  function handleRemove(line: CartLine) {
    const isLastItem = cart.itemCount === 1;
    cart.remove(line.item.id);
    // Nothing left to check out: go back to the menu instead of showing an empty cart.
    if (isLastItem) router.back();
  }

  if (cart.lines.length === 0) {
    return (
      <ThemedView
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          padding: GUTTER,
        }}
      >
        <ThemedText style={{ textAlign: 'center' }}>
          {soldOut.length > 0
            ? 'Everything in your cart just sold out. You weren’t charged.'
            : 'Your cart is empty.'}
        </ThemedText>
        <Button variant="text" onPress={() => router.back()}>
          {'Back to menu'}
        </Button>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      {/*
        No KeyboardAvoidingView: it pushed the whole footer up with the keyboard, leaving a thin
        strip for the list, so the note field ended up behind the footer. Instead the keyboard
        simply covers the footer, and the ScrollView makes room above the keyboard and scrolls
        the focused field into view (automaticallyAdjustKeyboardInsets, iOS).
      */}
      <ScrollView
        style={{ flex: 1 }}
        automaticallyAdjustKeyboardInsets
        // Drag the list down to pull the keyboard away, like in Messages.
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: GUTTER, gap: 16 }}
      >
        <CheckoutHeader title="Your cart" backLabel="Back to menu" />
        <CheckoutSteps current={1} />
        {cafe && (
          <ThemedText color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
            {`From ${cafe.name} · ${formatDistance(cafe.distanceM)} away`}
          </ThemedText>
        )}

        {soldOut.length > 0 && (
          <Banner
            tone="warn"
            title={
              soldOut.length === 1
                ? '1 item just sold out'
                : `${soldOut.length} items just sold out`
            }
            text={`We removed ${soldOut.length === 1 ? 'it' : 'them'} and updated your total. You weren’t charged for ${soldOut.length === 1 ? 'it' : 'them'}.`}
          />
        )}

        <View>
          {cart.lines.map((line, index) => (
            <CartRow
              key={line.item.id}
              line={line}
              isLast={index === cart.lines.length - 1 && soldOut.length === 0}
              onIncrement={() => cart.add(line.item)}
              onDecrement={() => handleRemove(line)}
            />
          ))}
          {soldOut.map((item) => (
            <SoldOutRow key={item.id} item={item} />
          ))}
        </View>

        <View style={{ gap: 8, paddingBottom: 16 }}>
          <ThemedText type="subhead" weight="semibold">
            {'Note for the café '}
            <ThemedText type="subhead" color="ink2">
              {'(optional)'}
            </ThemedText>
          </ThemedText>
          <TextField
            value={cart.note}
            onChangeText={cart.setNote}
            placeholder="e.g. no sugar, I’m on the bench by the fountain"
            accessibilityLabel="Note for the café, optional"
            multiline
            style={{ minHeight: 0, paddingVertical: 12, lineHeight: 25 }}
          />
        </View>

        {/*
          The test server's menu never sells out by itself. In development builds this marks the
          first item as sold out on the server (POST /dev/sell-out), so "Go to checkout" shows E6.
          It stays sold out until you reset the server's data. Users never see this button.
        */}
        {__DEV__ && (
          <Button
            variant="text"
            size="small"
            onPress={() => sellOutForTesting(cart.lines[0].item.id)}
            style={{ marginBottom: 16 }}
          >
            {'Sell out the first item (dev only)'}
          </Button>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 12, gap: 12 }}>
        <PriceSummary
          subtotalCents={cart.subtotalCents}
          deliveryFeeCents={cafe?.deliveryFeeCents ?? 0}
        />
        <Button onPress={goToCheckout} loading={checking}>
          {'Go to checkout'}
        </Button>
      </View>
    </ThemedView>
  );
}

/** E6: an item that was taken out because it sold out. "Replace" goes back to the menu. */
function SoldOutRow({ item }: { item: MenuItem }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
      <View style={{ opacity: 0.45 }}>
        <ProductThumb image={item.image} section={item.section} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText weight="semibold" color="ink2">{`Removed: ${item.name}`}</ThemedText>
        <ThemedText type="subhead" color="ink2">
          {'Sold out'}
        </ThemedText>
      </View>
      <Button variant="text" size="small" onPress={() => router.back()}>
        {'Replace'}
      </Button>
    </View>
  );
}

function CartRow({
  line,
  isLast,
  onIncrement,
  onDecrement,
}: {
  line: CartLine;
  isLast: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const theme = useTheme();
  const { item, quantity } = line;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.line,
      }}
    >
      <ProductThumb image={item.image} section={item.section} />
      <View style={{ flex: 1 }}>
        <ThemedText weight="semibold">{item.name}</ThemedText>
        <ThemedText type="subhead" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
          {formatPrice(item.priceCents)}
        </ThemedText>
      </View>
      <QuantityStepper
        name={item.name}
        quantity={quantity}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />
    </View>
  );
}
