import { View, type ViewProps } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  background?: ThemeColor;
};

export function ThemedView({ style, background, ...rest }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[background ?? 'background'] }, style]} {...rest} />;
}
