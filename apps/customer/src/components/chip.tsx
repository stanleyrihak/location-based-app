import { ThemedText, Radius, useTheme } from '@shoot/ui';
import { Pressable } from 'react-native';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Filter chip from the design (`.chip`, and `.chip[aria-pressed="true"]` when selected). */
export function Chip({ label, selected, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          paddingHorizontal: 16,
          borderRadius: Radius.pill,
          borderWidth: 1.5,
          justifyContent: 'center',
          // Selected is the inverse of normal, so it reads without relying on colour.
          backgroundColor: selected ? theme.ink : theme.surface,
          borderColor: selected ? theme.ink : theme.lineStrong,
        },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      <ThemedText
        type="subhead"
        weight={selected ? 'semibold' : 'medium'}
        color={selected ? 'inkInverse' : 'ink'}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
