import { type StyleProp, View, type ViewStyle } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'info' | 'warn' | 'success';

type Props = {
  title: string;
  text: string;
  /**
   * `info`: the sand box (`.banner.info`).
   * `warn`: white with an orange outline (`.banner.warn`).
   * `success`: white with an olive tick on the left (`.banner.success`).
   */
  tone?: Tone;
  /** A small text button on the right, like "Map" on 2.3. */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
};

export function Banner({ title, text, tone = 'info', action, style }: Props) {
  const theme = useTheme();

  const toneStyle: Record<Tone, ViewStyle> = {
    info: { backgroundColor: theme.infoBg },
    warn: { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.warning },
    success: { backgroundColor: theme.surface },
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: tone === 'success' ? 'center' : 'flex-start',
          gap: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: Radius.input,
        },
        toneStyle[tone],
        style,
      ]}
    >
      {tone === 'success' && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.success,
          }}
        >
          <Icon name="check" size="sm" color="onSuccess" bold />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText weight="semibold" style={{ lineHeight: 22 }}>
          {title}
        </ThemedText>
        <ThemedText
          type="subhead"
          color={tone === 'info' ? 'ink' : 'ink2'}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {text}
        </ThemedText>
      </View>
      {action && (
        <Button variant="text" size="small" onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </View>
  );
}
