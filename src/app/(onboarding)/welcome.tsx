import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius } from '@/constants/theme';
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
      <ThemedText type="display" color="accent" style={{ marginBottom: 32 }}>
        Shoot
      </ThemedText>
      <ThemedText type="display" color="ink">
        Your favourites, delivered right to
      </ThemedText>
      <ThemedText type="display" color="accent" style={{ marginBottom: 12 }}>
        your spot.
      </ThemedText>
      <ThemedText type="body" color="ink" style={{ marginBottom: 24 }}>
        Skip the queue, the café brings it
      </ThemedText>
      <View
        style={{
          flex: 1,
          alignSelf: 'stretch',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.surfaceMuted,
          borderRadius: Radius.card,
          marginBottom: 16,
        }}
      >
        <Image
          source={require('@/assets/images/welcome-illustration.svg')}
          contentFit="contain"
          style={{ width: '90%', height: '90%' }}
        />
      </View>
      <Button
        onPress={() => router.push('/phone-number')}
        style={{ marginBottom: 12, width: '100%' }}
      >
        {'Get started'}
      </Button>
      <Text style={{ textAlign: 'center', color: theme.ink2 }}>
        {'By continuing you agree to the '}
        <TextLink href={'/'}>{'Terms'}</TextLink>
        {' and '}
        <TextLink href={'/'}>{'Privacy Policy'}</TextLink>
      </Text>
    </ThemedView>
  );
}
