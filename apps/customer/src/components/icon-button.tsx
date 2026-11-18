import { Icon, type IconName, Shadow, useTheme } from '@shoot/ui';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  icon: IconName;
  /** Required: an icon alone says nothing to VoiceOver. */
  accessibilityLabel: string;
  onPress: () => void;
  /** `raised` is the white circle with a shadow (`.icon-btn`), for use on photos. */
  variant?: 'raised' | 'plain';
  /** Doesn't react to taps, and is drawn faded. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A round 44 pt icon-only button. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  disabled = false,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
        },
        variant === 'raised' && { backgroundColor: theme.surface, boxShadow: Shadow.card },
        pressed && { backgroundColor: variant === 'raised' ? theme.surface2 : theme.tintPress },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}
