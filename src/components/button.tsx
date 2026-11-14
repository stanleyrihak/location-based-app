import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { CameraColors, FontWeight, Radius, Typography, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'text';

type Props = {
  children: string;
  onPress?: PressableProps['onPress'];
  variant?: Variant;
  size?: 'default' | 'small';
  disabled?: boolean;
  icon?: IconName;
  trailing?: string;
  /** For camera screens with the brown background (`.cam` in the design). */
  camera?: boolean;
  style?: StyleProp<ViewStyle>;
};

type VariantColors = {
  background: string;
  pressedBackground: string;
  border?: string;
  /** A ThemeColor key, so that Icon and Text can both use it. */
  content: ThemeColor;
};

function getVariantColors(
  theme: ReturnType<typeof useTheme>,
  camera: boolean,
): Record<Variant, VariantColors> {
  if (camera) {
    return {
      // Cream button with brown text. 'ink' is brown and 'inkInverse' is cream.
      primary: {
        background: CameraColors.primary,
        pressedBackground: CameraColors.primaryPressed,
        content: 'ink',
      },
      secondary: {
        background: 'transparent',
        pressedBackground: theme.tintPress,
        border: CameraColors.ink,
        content: 'inkInverse',
      },
      text: { background: 'transparent', pressedBackground: 'transparent', content: 'inkInverse' },
    };
  }

  return {
    primary: {
      background: theme.primary,
      pressedBackground: theme.primaryPressed,
      content: 'onPrimary',
    },
    secondary: {
      background: 'transparent',
      pressedBackground: theme.tintPress,
      border: theme.ink,
      content: 'ink',
    },
    text: { background: 'transparent', pressedBackground: 'transparent', content: 'primary' },
  };
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  icon,
  trailing,
  camera = false,
  style,
}: Props) {
  const theme = useTheme();
  const colors = getVariantColors(theme, camera)[variant];
  const isText = variant === 'text';
  const content: ThemeColor = disabled ? 'ink2' : colors.content;
  const hasShadow = variant === 'primary' && !camera && !disabled;

  function getBackground(pressed: boolean) {
    if (disabled) return isText ? 'transparent' : theme.surface2;
    return pressed ? colors.pressedBackground : colors.background;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.pressable,
        isText ? styles.textBox : styles[size],
        trailing !== undefined && styles.split,
        { backgroundColor: getBackground(pressed) },
        colors.border !== undefined && !disabled && { borderWidth: 2, borderColor: colors.border },
        hasShadow && styles.shadow,
        pressed && !disabled && (isText ? styles.pressedText : styles.pressed),
        style,
      ]}
    >
      {icon && <Icon name={icon} size="base" color={content} />}
      <Text
        style={[
          Typography.button,
          size === 'small' && styles.smallLabel,
          isText && styles.underline,
          isText && disabled && { textDecorationColor: theme.lineStrong },
          trailing !== undefined && styles.shrink,
          { color: theme[content] },
        ]}
      >
        {children}
      </Text>
      {trailing !== undefined && (
        <Text style={[Typography.button, styles.trailing, { color: theme[content] }]}>
          {trailing}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.pill,
  },
  default: {
    minHeight: 56,
    paddingHorizontal: 24,
  },
  small: {
    minHeight: 44,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  textBox: {
    minHeight: 44,
    paddingHorizontal: 4,
    alignSelf: 'center',
  },
  split: {
    justifyContent: 'space-between',
  },
  shadow: {
    boxShadow: '0 2px 6px -2px rgba(174, 67, 30, 0.45)', // --shadow-primary
  },
  pressed: {
    transform: [{ scale: 0.98 }], // --press-scale
  },
  pressedText: {
    opacity: 0.6,
  },
  smallLabel: {
    fontSize: Typography.subhead.fontSize,
  },
  underline: {
    textDecorationLine: 'underline',
  },
  shrink: {
    flexShrink: 1,
  },
  trailing: {
    fontWeight: FontWeight.bold,
  },
});
