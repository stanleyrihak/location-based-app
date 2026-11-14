import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Shrikhand_400Regular } from '@expo-google-fonts/shrikhand';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { NavigationTheme } from '@/constants/theme';
import { OnboardingProvider, useOnboarding } from '@/providers/onboarding-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: 'Inter',
      fontDefinitions: [
        { path: Inter_400Regular, weight: 400, style: 'normal' },
        { path: Inter_500Medium, weight: 500, style: 'normal' },
        { path: Inter_600SemiBold, weight: 600, style: 'normal' },
        { path: Inter_700Bold, weight: 700, style: 'normal' },
      ],
    },
    {
      fontFamily: 'Shrikhand',
      fontDefinitions: [{ path: Shrikhand_400Regular, weight: 400, style: 'normal' }],
    },
  ]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={NavigationTheme}>
      <OnboardingProvider>
        <RootNavigator />
      </OnboardingProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { hasOnboarded } = useOnboarding();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasOnboarded} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cafe/[id]" />
      </Stack.Protected>

      <Stack.Protected guard={!hasOnboarded} redirectTo="/">
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
    </Stack>
  );
}
