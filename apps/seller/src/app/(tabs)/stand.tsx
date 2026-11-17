import { ApiError } from '@shoot/shared';
import { Button, Radius, Shadow, ThemedText, ThemedView, useTheme } from '@shoot/ui';
import { router } from 'expo-router';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpdateCafe } from '@/data/use-update-cafe';
import { useSession } from '@/providers/session-provider';

const GUTTER = 24;

/** The café: pause orders, move the stand, who's signed in. */
export default function StandScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { seller, signOut } = useSession();
  const update = useUpdateCafe();
  const cafe = seller?.cafe;
  // While saving, the switch shows what was asked for; then the server's answer.
  const paused = update.isPending ? (update.variables?.isPaused ?? cafe?.isPaused) : cafe?.isPaused;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
          gap: 24,
          flexGrow: 1,
        }}
      >
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Stand'}
        </ThemedText>

        <View style={{ gap: 4 }}>
          <ThemedText type="title" weight="bold">
            {cafe?.name ?? ' '}
          </ThemedText>
          <ThemedText color="ink2">{cafe?.phone || ' '}</ThemedText>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderRadius: Radius.card,
            backgroundColor: theme.surface,
            boxShadow: Shadow.card,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText weight="semibold">{'Pause orders'}</ThemedText>
            <ThemedText type="subhead" color="ink2">
              {paused
                ? 'Paused: customers see the café, but can’t order.'
                : 'Customers can order now.'}
            </ThemedText>
            {update.isError && (
              <ThemedText type="caption" color="error" accessibilityRole="alert">
                {update.error instanceof ApiError && update.error.code === 'network'
                  ? 'No connection to the server. Try again.'
                  : 'That didn’t save. Try again.'}
              </ThemedText>
            )}
          </View>
          <Switch
            value={paused ?? false}
            disabled={!cafe}
            onValueChange={(isPaused) => update.mutate({ isPaused })}
            accessibilityLabel="Pause orders"
            trackColor={{ true: theme.accent, false: theme.lineStrong }}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Button variant="secondary" icon="pin" onPress={() => router.push('/stand-location')}>
            {'Sell from here'}
          </Button>
          <ThemedText type="subhead" color="ink2">
            {'Moves your stand to where you are. The delivery area is measured from it.'}
          </ThemedText>
        </View>

        <View style={{ marginTop: 'auto', gap: 8 }}>
          <ThemedText type="subhead" color="ink2">
            {seller ? `${seller.name} · ${seller.email}` : ' '}
          </ThemedText>
          <Button variant="secondary" onPress={signOut}>
            {'Sign out'}
          </Button>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
