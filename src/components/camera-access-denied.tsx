import { router } from 'expo-router';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Props = {
  title: string;
  text: string;
  /** What "back" leads to, for VoiceOver. */
  backLabel: string;
};

/**
 * Shown instead of the camera when access is off (based on E2). The app can't ask again
 * once the user said no: iOS only shows that dialog once. So the only way is Settings.
 */
export function CameraAccessDenied({ title, text, backLabel }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 8,
      }}
    >
      <View style={{ minHeight: 52, justifyContent: 'center' }}>
        <IconButton
          icon="back"
          accessibilityLabel={backLabel}
          onPress={() => router.back()}
          style={{ marginLeft: -10 }}
        />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <ThemedText type="headline" accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText color="ink2">{text}</ThemedText>
        <Banner title="Camera access is off" text="Settings › Shoot › Camera" />
      </View>
      {/* Opens this app's page in the Settings app. */}
      <Button onPress={() => Linking.openSettings()}>{'Open settings'}</Button>
    </ThemedView>
  );
}
