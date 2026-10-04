import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsTileSection } from '@/components/settings-tile-section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function Profile() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        Platform.OS === 'android' && { paddingTop: insets.top + Spacing.md },
      ]}
    >
      <View>
        <ThemedText type="overline" themeColor="primary">
          Your account
        </ThemedText>
        <ThemedText type="display">Profile</ThemedText>
      </View>
      <View style={styles.tileSectionsWrapper}>
        <SettingsTileSection
          title="Preferences"
          tiles={[{ name: 'Notifications' }, { name: 'Location' }, { name: 'Payment methods' }]}
        />
        <SettingsTileSection
          title="More"
          tiles={[{ name: 'Language' }, { name: 'Help & Support' }, { name: 'Privacy' }]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xxl,
  },
  tileSectionsWrapper: {
    gap: Spacing.xxl,
  },
});
