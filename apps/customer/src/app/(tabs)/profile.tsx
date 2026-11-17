import { Button, Radius, Shadow, ThemedText, ThemedView, useTheme } from '@shoot/ui';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { deleteAccount, signOut } from '@/data/api';
import { useMe } from '@/data/queries';
import { endSession } from '@/data/session';

const GUTTER = 24;

/**
 * Profile: your number, what the app may use, the legal pages, and your account.
 * Permissions can only be turned back on in the phone's Settings, so the rows link there.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const [location, , readLocation] = Location.useForegroundPermissions();
  const [camera, , readCamera] = useCameraPermissions();

  // Back from Settings: read the permissions again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void readLocation();
        void readCamera();
      }
    });
    return () => subscription.remove();
  }, [readLocation, readCamera]);

  async function handleSignOut() {
    // Tell the server first; sign out here even if that fails (no connection).
    await signOut().catch(() => {});
    endSession();
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'Your number and sign-in are deleted. Cafés keep past orders for their accounts, without your number. This can’t be undone.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              endSession();
            } catch {
              Alert.alert('It didn’t work', 'Check your connection and try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 32,
          gap: 24,
        }}
      >
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Profile'}
        </ThemedText>

        <Section title="Phone number">
          <Row
            label={me.data?.phone ?? ' '}
            action="Change"
            onPress={() => router.push('/change-phone')}
          />
        </Section>

        <Section title="Permissions">
          <Row
            label="Location"
            detail={location?.granted ? 'Allowed' : 'Not allowed'}
            action="Open Settings"
            onPress={() => void Linking.openSettings()}
          />
          <Row
            label="Camera"
            detail={camera?.granted ? 'Allowed' : 'Not allowed'}
            action="Open Settings"
            onPress={() => void Linking.openSettings()}
          />
        </Section>

        <Section title="About">
          <Row label="Terms of service" onPress={() => router.push('/terms')} />
          <Row label="Privacy" onPress={() => router.push('/privacy')} />
        </Section>

        <View style={{ gap: 12 }}>
          <Button variant="secondary" onPress={handleSignOut}>
            {'Sign out'}
          </Button>
          <Button variant="text" onPress={confirmDelete}>
            {'Delete account'}
          </Button>
        </View>

        {/* Development builds only: __DEV__ is false in release builds. */}
        {__DEV__ && (
          <Section title="Developer">
            <Row label="Reset onboarding" onPress={endSession} />
          </Section>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <ThemedText type="label" color="ink2" accessibilityRole="header">
        {title}
      </ThemedText>
      <View
        style={{
          borderRadius: Radius.card,
          backgroundColor: theme.surface,
          boxShadow: Shadow.card,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  detail,
  action,
  onPress,
}: {
  label: string;
  detail?: string;
  action?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[label, detail, action].filter(Boolean).join(', ')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 16,
        backgroundColor: pressed ? theme.surface2 : 'transparent',
      })}
    >
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontVariant: ['tabular-nums'] }}>{label}</ThemedText>
        {detail && (
          <ThemedText type="subhead" color="ink2">
            {detail}
          </ThemedText>
        )}
      </View>
      {action && (
        <ThemedText weight="semibold" color="primary">
          {action}
        </ThemedText>
      )}
    </Pressable>
  );
}
