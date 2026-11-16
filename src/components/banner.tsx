import { type StyleProp, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  text: string;
  /** `info` is the sand box (`.banner.info`), `warn` is white with an orange outline (`.banner.warn`). */
  tone?: 'info' | 'warn';
  style?: StyleProp<ViewStyle>;
};

export function Banner({ title, text, tone = 'info', style }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          gap: 2,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: Radius.input,
        },
        tone === 'info'
          ? { backgroundColor: theme.infoBg }
          : { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.warning },
        style,
      ]}
    >
      <ThemedText weight="semibold" style={{ lineHeight: 22 }}>
        {title}
      </ThemedText>
      <ThemedText type="subhead" color={tone === 'info' ? 'ink' : 'ink2'}>
        {text}
      </ThemedText>
    </View>
  );
}
