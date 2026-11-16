import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Used in the VoiceOver labels: "Remove one cappuccino". */
  name: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
};

/** Minus, number, plus in a pill (`.qty` in the design). */
export function QuantityStepper({ name, quantity, onIncrement, onDecrement }: Props) {
  const theme = useTheme();
  const lower = name.toLowerCase();

  return (
    <View
      // VoiceOver reads it as one control you swipe up or down, like the iOS stepper.
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${name}, quantity`}
      accessibilityValue={{ text: String(quantity) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        event.nativeEvent.actionName === 'increment' ? onIncrement() : onDecrement()
      }
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.lineStrong,
        borderRadius: 999,
        backgroundColor: theme.surface,
      }}
    >
      <StepButton icon="minus" label={`Remove one ${lower}`} onPress={onDecrement} />
      <ThemedText
        weight="semibold"
        style={{ minWidth: 20, textAlign: 'center', fontVariant: ['tabular-nums'] }}
      >
        {quantity}
      </ThemedText>
      <StepButton icon="plus" label={`Add one ${lower}`} onPress={onIncrement} />
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? theme.tintPress : 'transparent',
      })}
    >
      <Icon name={icon} size="sm" bold />
    </Pressable>
  );
}
