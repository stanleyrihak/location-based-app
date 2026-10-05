import { Text, type TextProps } from 'react-native';

import { FontFamily, Typography, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: keyof typeof Typography;
  weight?: keyof typeof FontFamily;
  color?: ThemeColor;
};

export function ThemedText({ style, type = 'body', weight, color, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        Typography[type],
        weight && { fontFamily: FontFamily[weight] },
        { color: theme[color ?? 'text'] },
        style,
      ]}
      {...rest}
    />
  );
}
