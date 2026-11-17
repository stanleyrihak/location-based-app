import { Banner, Button, ThemedText, ThemedView, FontWeight, useTheme } from '@shoot/ui';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationIllustration } from '@/components/location-illustration';

type Props = {
  onOpenSettings: () => void;
  onTryAgain: () => void;
  onBrowse: () => void;
};

export function LocationDenied({ onOpenSettings, onTryAgain, onBrowse }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

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
        <LocationIllustration accessibilityLabel="A map pin waiting for your location" />

        <ThemedText
          type="headline"
          accessibilityRole="header"
          style={{ marginTop: 12, textAlign: 'center' }}
        >
          {'We need your location'}
        </ThemedText>
        <ThemedText type="body" color="ink2" style={{ textAlign: 'center' }}>
          {
            'Cafés deliver only within a short walk. Without your location we can’t tell which cafés can reach you.'
          }
        </ThemedText>

        <Banner
          title="How to turn it on"
          text="Settings › Shoot › Location › While using the app"
          style={{ marginTop: 12, alignSelf: 'stretch' }}
        />

        <ThemedText type="subhead" color="ink2" style={{ marginTop: 4, textAlign: 'center' }}>
          {'You can still '}
          <ThemedText
            type="subhead"
            accessibilityRole="link"
            onPress={onBrowse}
            style={{
              color: theme.primary,
              fontWeight: FontWeight.semibold,
              textDecorationLine: 'underline',
            }}
          >
            {'browse café menus'}
          </ThemedText>
          {'. To order, the café needs to know where you are.'}
        </ThemedText>
      </View>

      <View style={{ paddingTop: 16, gap: 12, alignItems: 'center' }}>
        <Button onPress={onOpenSettings} style={{ alignSelf: 'stretch' }}>
          {'Open settings'}
        </Button>
        <Button variant="text" onPress={onTryAgain}>
          {'Try again'}
        </Button>
      </View>
    </ThemedView>
  );
}
