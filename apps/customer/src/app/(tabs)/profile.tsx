import {
  Button,
  Icon,
  type IconName,
  Radius,
  Shadow,
  ThemedText,
  ThemedView,
  useTheme,
} from '@shoot/ui';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Children, type ReactNode, useEffect } from 'react';
import { AppState, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { displayPhone } from '@/components/country-code-select';
import { signOut } from '@/data/api';
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

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        // flexGrow: the content fills the screen, so Sign out can sit at the bottom.
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
          gap: 24,
        }}
      >
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Profile'}
        </ThemedText>

        <Section title="Phone number">
          <Row
            icon="phone"
            label={me.data ? displayPhone(me.data.phone) : ' '}
            hint="Change phone number"
            onPress={() => router.push('/change-phone')}
          />
        </Section>

        <Section title="Permissions">
          <Row
            icon="pin"
            label="Location"
            detail={location?.granted ? 'Allowed' : 'Not allowed'}
            hint="Opens Settings"
            onPress={() => void Linking.openSettings()}
          />
          <Row
            icon="camera"
            label="Camera"
            detail={camera?.granted ? 'Allowed' : 'Not allowed'}
            hint="Opens Settings"
            onPress={() => void Linking.openSettings()}
          />
        </Section>

        <Section title="About">
          <Row icon="help" label="Terms of service" onPress={() => router.push('/terms')} />
          <Row icon="shield" label="Privacy" onPress={() => router.push('/privacy')} />
        </Section>

        {/*
          At the bottom, like the seller's Stand tab. Signing in again with the same number
          brings back the same account and its orders.
        */}
        <Button variant="secondary" onPress={handleSignOut} style={{ marginTop: 'auto' }}>
          {'Sign out'}
        </Button>
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
        {/*
          A thin line between rows. It starts where the text starts, not under the badge,
          so each badge and its text read as one row.
        */}
        {Children.toArray(children).map((child, index) => (
          <View key={index}>
            {index > 0 && (
              <View
                style={{ height: 1, marginLeft: ROW_TEXT_START, backgroundColor: theme.line }}
              />
            )}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

// Padding, badge and gap of a Row: where its text starts.
const ROW_PADDING = 16;
const BADGE_SIZE = 36;
const ROW_GAP = 14;
const ROW_TEXT_START = ROW_PADDING + BADGE_SIZE + ROW_GAP;

/**
 * One row, drawn like the other rows in the app (the payment row on 2.8): a sand badge with
 * an icon, the text, and a chevron that says "this opens something".
 */
function Row({
  icon,
  label,
  detail,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  /** What a tap does, for VoiceOver. The chevron shows it on screen. */
  hint?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[label, detail].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: ROW_GAP,
        minHeight: 64,
        paddingVertical: 12,
        paddingHorizontal: ROW_PADDING,
        backgroundColor: pressed ? theme.surface2 : 'transparent',
      })}
    >
      <View
        style={{
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: Radius.sm,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surface2,
        }}
      >
        <Icon name={icon} size="md" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText weight="semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {label}
        </ThemedText>
        {detail && (
          <ThemedText type="subhead" color="ink2">
            {detail}
          </ThemedText>
        )}
      </View>
      <Icon name="chev-r" color="ink2" />
    </Pressable>
  );
}
