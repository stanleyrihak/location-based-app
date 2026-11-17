import { Button, ThemedText, ThemedView } from '@shoot/ui';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationDenied } from '@/components/location-denied';
import { LocationIllustration } from '@/components/location-illustration';
import { useOnboarding } from '@/providers/onboarding-provider';

/**
 * - checking: reading the current permission, nothing to show yet
 * - intro:    design 1.4, explains why before the iOS alert (shown on "Continue")
 * - denied:   design 1.5
 */
type Status = 'checking' | 'intro' | 'denied';

export default function LocationPermissionScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useOnboarding();
  const [status, setStatus] = useState<Status>('checking');
  const [isRequesting, setIsRequesting] = useState(false);

  // On open: skip this step if the answer is already known.
  useEffect(() => {
    let cancelled = false;

    async function checkOnOpen() {
      const current = await Location.getForegroundPermissionsAsync();

      if (cancelled) return;

      if (current.granted) {
        completeOnboarding();
        return;
      }

      // iOS shows its alert only once. After a "Don't allow", canAskAgain is
      // false and the only way to change the answer is the Settings app.
      setStatus(current.canAskAgain ? 'intro' : 'denied');
    }

    checkOnOpen();

    return () => {
      cancelled = true;
    };
  }, [completeOnboarding]);

  // While denied: when the user comes back from Settings, check again.
  useEffect(() => {
    if (status !== 'denied') return;

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;

      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) {
        completeOnboarding();
      }
    });

    return () => subscription.remove();
  }, [status, completeOnboarding]);

  // "Continue" on 1.4: only now does the iOS alert appear.
  async function requestPermission() {
    setIsRequesting(true);
    const result = await Location.requestForegroundPermissionsAsync();
    setIsRequesting(false);

    if (result.granted) {
      completeOnboarding();
    } else {
      setStatus('denied');
    }
  }

  async function tryAgain() {
    const result = await Location.requestForegroundPermissionsAsync();

    if (result.granted) {
      completeOnboarding();
    } else if (!result.canAskAgain) {
      Linking.openSettings();
    }
  }

  if (status === 'denied') {
    return (
      <LocationDenied
        onOpenSettings={() => Linking.openSettings()}
        onTryAgain={tryAgain}
        onBrowse={completeOnboarding}
      />
    );
  }

  if (status === 'checking') {
    return <ThemedView style={{ flex: 1 }} />;
  }

  return (
    <ThemedView
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <LocationIllustration active accessibilityLabel="Map pin inside its delivery radius" />
        <ThemedText
          type="headline"
          accessibilityRole="header"
          style={{ marginTop: 12, textAlign: 'center' }}
        >
          {'Find cafés near you'}
        </ThemedText>
        <ThemedText type="body" color="ink2" style={{ textAlign: 'center' }}>
          {
            'We use your location to show cafés that can reach you, so the café can find you at your spot.'
          }
        </ThemedText>
      </View>

      <View style={{ paddingTop: 16 }}>
        {/* "Continue", not "Allow": Apple asks that a screen before a permission
            alert doesn't pretend to grant the permission itself. */}
        <Button onPress={requestPermission} disabled={isRequesting}>
          {'Continue'}
        </Button>
      </View>
    </ThemedView>
  );
}
