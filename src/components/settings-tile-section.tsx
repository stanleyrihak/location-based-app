import { StyleSheet, View } from 'react-native';

import { SettingsTile, type SettingsTileProps } from '@/components/settings-tile';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  tiles: SettingsTileProps[];
};

export function SettingsTileSection({ title, tiles }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText type="section" style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.tilesWrapper}>
        {tiles.map((tile, i) => (
          <SettingsTile
            key={tile.name}
            name={tile.name}
            icon={tile.icon}
            showDivider={i < tiles.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    marginLeft: Spacing.xs,
  },
  tilesWrapper: {
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
