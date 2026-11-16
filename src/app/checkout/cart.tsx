import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckoutHeader } from '@/components/checkout-header';
import { CheckoutSteps } from '@/components/checkout-steps';
import { PriceSummary } from '@/components/price-summary';
import { ProductThumb } from '@/components/product-thumb';
import { QuantityStepper } from '@/components/quantity-stepper';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNearbyCafe } from '@/data/queries';
import { useTheme } from '@/hooks/use-theme';
import { type CartLine, useCart } from '@/providers/cart-provider';
import { formatDistance, formatPrice } from '@/utils/format';

const GUTTER = 24;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');

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
        <ThemedText>{'Your cart is empty.'}</ThemedText>
        <Button variant="text" onPress={() => router.back()}>
          {'Back'}
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

        <View>
          {cart.lines.map((line, index) => (
            <CartRow
              key={line.item.id}
              line={line}
              isLast={index === cart.lines.length - 1}
              onIncrement={() => cart.add(line.item)}
              onDecrement={() => handleRemove(line)}
            />
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
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 12, gap: 12 }}>
        <PriceSummary
          subtotalCents={cart.subtotalCents}
          deliveryFeeCents={cafe?.deliveryFeeCents ?? 0}
        />
        <Button onPress={() => router.push('/checkout/spot')}>{'Go to checkout'}</Button>
      </View>
    </ThemedView>
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
