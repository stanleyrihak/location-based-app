import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  title: string;
  lede?: string;
};

export function PageHeader({ title, lede }: Props) {
  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="headline" accessibilityRole="header">
        {title}
      </ThemedText>
      {lede !== undefined && (
        <ThemedText type="body" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
          {lede}
        </ThemedText>
      )}
    </View>
  );
}
