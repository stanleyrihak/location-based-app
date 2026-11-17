import type { DeclineReason } from '@shoot/shared';
import { Button, Radius, ThemedText, useTheme } from '@shoot/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actionErrorMessage, useOrderActions } from '@/data/use-order-actions';

const REASONS: { value: DeclineReason; label: string }[] = [
  { value: 'sold-out', label: 'Sold out' },
  { value: 'too-busy', label: 'Too busy' },
  { value: 'closing-soon', label: 'Closing soon' },
  { value: 'other', label: 'Something else' },
];

/**
 * Decline, as a sheet: pick why, so the customer gets an honest message. The reservation on
 * their card is released; they're never charged.
 */
export default function DeclineSheet() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { decline } = useOrderActions(id);
  const [reason, setReason] = useState<DeclineReason>('too-busy');

  return (
    <View
      style={{ paddingTop: 28, paddingHorizontal: 16, paddingBottom: insets.bottom + 8, gap: 12 }}
    >
      <ThemedText
        type="title"
        weight="bold"
        accessibilityRole="header"
        style={{ paddingHorizontal: 4 }}
      >
        {'Why can’t you take it?'}
      </ThemedText>
      <ThemedText color="ink2" style={{ paddingHorizontal: 4 }}>
        {'The customer sees this, and isn’t charged.'}
      </ThemedText>

      <View accessibilityRole="radiogroup" style={{ gap: 8, marginTop: 4 }}>
        {REASONS.map((option) => (
          <ReasonRow
            key={option.value}
            label={option.label}
            selected={reason === option.value}
            onSelect={() => setReason(option.value)}
          />
        ))}
      </View>

      {decline.isError && (
        <ThemedText color="error" accessibilityRole="alert">
          {actionErrorMessage(decline.error)}
        </ThemedText>
      )}

      <Button
        variant="ink"
        loading={decline.isPending}
        onPress={() => decline.mutate(reason, { onSuccess: () => router.back() })}
        style={{ marginTop: 4 }}
      >
        {'Decline order'}
      </Button>
      <Button variant="text" onPress={() => router.back()} disabled={decline.isPending}>
        {'Cancel'}
      </Button>
    </View>
  );
}

/** A radio row, like the customer app's payment methods: dark outline when selected. */
function ReasonRow({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 52,
        paddingHorizontal: 16,
        borderRadius: Radius.input,
        backgroundColor: theme.surface,
        borderWidth: 2,
        borderColor: selected ? theme.ink : 'transparent',
      }}
    >
      <ThemedText style={{ flex: 1 }}>{label}</ThemedText>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? theme.ink : theme.lineStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.ink }} />
        )}
      </View>
    </Pressable>
  );
}
