import { ThemedText, Radius } from '@shoot/ui';
import { StyleSheet, View } from 'react-native';

import { SettingsTile, type SettingsTileProps } from '@/components/settings-tile';

type Props = {
  title: string;
  tiles: SettingsTileProps[];
};

export function SettingsTileSection({ title, tiles }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
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
    gap: 8,
  },
  title: {
    marginLeft: 4,
  },
  tilesWrapper: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
