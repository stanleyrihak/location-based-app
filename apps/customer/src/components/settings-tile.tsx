import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SettingsTileProps = {
  name: string;
  icon: IconName;
  showDivider?: boolean;
};

export function SettingsTile({ name, showDivider = false, icon }: SettingsTileProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface },
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.line,
        },
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: theme.surface2 }]}>
        <Icon name={icon} size="md" color="primary" />
      </View>
      <ThemedText type="label">{name}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
