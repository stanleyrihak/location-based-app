import { Text, type TextProps } from 'react-native';

import { FontWeight, type ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: keyof typeof Typography;
  weight?: keyof typeof FontWeight;
  color?: ThemeColor;
};

export function ThemedText({ style, type = 'body', weight, color, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        Typography[type],
        weight && { fontWeight: FontWeight[weight] },
        { color: theme[color ?? 'ink'] },
        style,
      ]}
      {...rest}
    />
  );
}
