import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SettingsTileProps = {
  name: string;
  showDivider?: boolean;
};

export function SettingsTile({ name, showDivider = false }: SettingsTileProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface },
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: theme.primarySoft }]} />
      <ThemedText type="label">{name}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    // minHeight instead of height so the row can grow with larger system text sizes
    minHeight: 56,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
});
