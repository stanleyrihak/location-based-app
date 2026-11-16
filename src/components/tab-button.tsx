import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentRef, Ref } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = TabTriggerSlotProps & {
  icon: IconName;
  label: string;
  ref?: Ref<ComponentRef<typeof Pressable>>;
};

export function TabButton({ icon, label, isFocused, ...props }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4, minHeight: 52 }}
    >
      <View
        style={{
          width: 60,
          height: 32,
          borderRadius: Radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFocused ? theme.accent : 'transparent',
        }}
      >
        <Icon name={icon} color={isFocused ? 'onAccent' : 'ink2'} />
      </View>
      <ThemedText
        type="micro"
        weight={isFocused ? 'semibold' : 'medium'}
        color={isFocused ? 'ink' : 'ink2'}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
