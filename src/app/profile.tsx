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
        <ThemedText type="overline" color="primary">
          Your account
        </ThemedText>
        <ThemedText type="display">Profile</ThemedText>
      </View>
      <View style={styles.tileSectionsWrapper}>
        <SettingsTileSection
          title="Preferences"
          tiles={[
            { name: 'Notifications', icon: { ios: 'bell', android: 'notifications' } },
            { name: 'Location', icon: { ios: 'mappin.and.ellipse', android: 'location_on' } },
            { name: 'Payment methods', icon: { ios: 'creditcard', android: 'credit_card' } },
          ]}
        />
        <SettingsTileSection
          title="More"
          tiles={[
            { name: 'Language', icon: { ios: 'globe', android: 'language' } },
            { name: 'Help & Support', icon: { ios: 'questionmark.circle', android: 'help' } },
            { name: 'Privacy', icon: { ios: 'hand.raised', android: 'privacy_tip' } },
          ]}
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
