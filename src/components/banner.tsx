import { type StyleProp, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  text: string;
  style?: StyleProp<ViewStyle>;
};

export function Banner({ title, text, style }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          gap: 2,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: Radius.input,
          backgroundColor: theme.infoBg,
        },
        style,
      ]}
    >
      <ThemedText weight="semibold" style={{ lineHeight: 22 }}>
        {title}
      </ThemedText>
      <ThemedText type="subhead">{text}</ThemedText>
    </View>
  );
}
