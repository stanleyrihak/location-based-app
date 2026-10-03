import { View, Text, StyleSheet } from 'react-native';
import SettingsTile, { SettingsTileProps } from '@/components/settings-tile';

type Props = {
  title: string;
  tiles: SettingsTileProps[];
};

const SettingsTileSection = ({ title, tiles }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.tilesWrapper}>
        {tiles.map((tile, i) => (
          <SettingsTile key={i} name={tile.name} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    gap: 10,
  },
  title: {
    fontSize: 18,
    marginLeft: 4,
  },
  tilesWrapper: {
    display: 'flex',
    gap: 2,
    //backgroundColor: "#fefefe",
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default SettingsTileSection;
