import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { CameraColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOnboarding } from '@/providers/onboarding-provider';

export default function Profile() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { resetOnboarding } = useOnboarding();

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        Platform.OS === 'android' && { paddingTop: insets.top + 12 },
      ]}
    >
      <ThemedText type="title">What is up boys</ThemedText>
      <Button onPress={resetOnboarding}>{'Reset onboarding'}</Button>

      <Button icon="camera" onPress={() => console.log('tap')}>
        Take photo
      </Button>
      <Button variant="secondary">Not now</Button>
      <Button variant="text" size="small">
        Resend code
      </Button>
      <Button disabled>Continue</Button>
      <Button trailing="€11.20">View cart · 3 items</Button>

      <View style={styles.cameraBox}>
        <Button camera icon="camera">
          Take photo
        </Button>
        <Button camera variant="secondary">
          Retake
        </Button>
        <Button camera variant="text">
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 24,
  },
  tileSectionsWrapper: {
    gap: 24,
  },
  cameraBox: {
    backgroundColor: CameraColors.bg,
    padding: 20,
    gap: 12,
    borderRadius: 20,
  },
});
