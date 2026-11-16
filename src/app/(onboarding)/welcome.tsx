import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ThemedView
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ThemedText type="display" color="accent" style={{ paddingTop: 20, marginBottom: 32 }}>
        Shoot
      </ThemedText>
      <ThemedText
        type="display"
        color="ink"
        accessibilityRole="header"
        style={{ textAlign: 'center' }}
      >
        Your favourites, delivered right to
      </ThemedText>
      <ThemedText type="display" color="accent" style={{ textAlign: 'center' }}>
        your spot.
      </ThemedText>
      <ThemedText type="body" color="ink2" style={{ marginTop: 12, textAlign: 'center' }}>
        Skip the queue. The café brings it to you.
      </ThemedText>
      <View
        style={{
          flex: 1,
          alignSelf: 'stretch',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.surface2,
          borderRadius: Radius.card,
          marginTop: 24,
          marginBottom: 16,
        }}
      >
        <Image
          source={require('@/assets/images/welcome-illustration.svg')}
          contentFit="contain"
          accessibilityLabel="Three friends sitting together with their coffees"
          style={{ width: '90%', height: '90%' }}
        />
      </View>
      <Button
        onPress={() => router.push('/phone-number')}
        style={{ marginBottom: 12, width: '100%' }}
      >
        {'Get started'}
      </Button>
      <ThemedText type="caption" color="ink2" style={{ textAlign: 'center' }}>
        {'By continuing you agree to the '}
        <TextLink href="/terms">{'Terms'}</TextLink>
        {' and '}
        <TextLink href="/privacy">{'Privacy Policy'}</TextLink>
      </ThemedText>
    </ThemedView>
  );
}
