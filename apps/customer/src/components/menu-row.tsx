import type { MenuItem } from '@shoot/shared';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ProductThumb } from '@/components/product-thumb';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/utils/format';

type Props = {
  item: MenuItem;
  /** How many are in the cart. Above 0, the add button shows the number. */
  quantity: number;
  /** Why adding is blocked, read out by VoiceOver. Undefined means you can add. */
  blockedReason: string | undefined;
  onAdd: () => void;
  isLast: boolean;
};

/** One product on the menu (`.menu-row`): text, photo, round add button. */
export function MenuRow({ item, quantity, blockedReason, onAdd, isLast }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.line,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText weight="semibold" color={item.soldOut ? 'ink2' : 'ink'}>
          {item.name}
        </ThemedText>
        <ThemedText type="subhead" color="ink2">
          {item.description}
        </ThemedText>
        <ThemedText
          weight="semibold"
          color={item.soldOut ? 'ink2' : 'ink'}
          style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}
        >
          {formatPrice(item.priceCents)}
        </ThemedText>
      </View>
      <ProductThumb image={item.image} section={item.section} muted={item.soldOut} />
      <AddButton
        name={item.name}
        quantity={quantity}
        blockedReason={blockedReason}
        onPress={onAdd}
      />
    </View>
  );
}

function AddButton({
  name,
  quantity,
  blockedReason,
  onPress,
}: {
  name: string;
  quantity: number;
  blockedReason: string | undefined;
  onPress: () => void;
}) {
  const theme = useTheme();
  const disabled = blockedReason !== undefined;
  const hasQuantity = quantity > 0 && !disabled;

  let label = `Add ${name}`;
  if (disabled) label = blockedReason;
  else if (hasQuantity) label = `${name}: ${quantity} in cart. Add one more`;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
        },
        disabled
          ? { borderStyle: 'dashed', borderColor: theme.lineStrong }
          : hasQuantity
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { backgroundColor: theme.surface, borderColor: theme.ink },
        pressed && { transform: [{ scale: 0.92 }] },
      ]}
    >
      {hasQuantity ? (
        <ThemedText weight="bold" color="onPrimary" style={{ fontVariant: ['tabular-nums'] }}>
          {quantity}
        </ThemedText>
      ) : (
        <Icon name="plus" size="md" bold color={disabled ? 'ink2' : 'ink'} />
      )}
    </Pressable>
  );
}
