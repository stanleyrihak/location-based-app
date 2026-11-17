import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Shrikhand_400Regular } from '@expo-google-fonts/shrikhand';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { SplashOverlay } from '@/components/splash-overlay';
import { NavigationTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CartProvider } from '@/providers/cart-provider';
import { OnboardingProvider, useOnboarding } from '@/providers/onboarding-provider';

SplashScreen.preventAutoHideAsync();

// Created once, outside the component: it holds the cache, so it must
// survive re-renders of RootLayout.
const queryClient = new QueryClient();

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

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NavigationTheme}>
        <OnboardingProvider>
          <CartProvider>
            <RootNavigator />
          </CartProvider>
        </OnboardingProvider>
        {showSplash && <SplashOverlay onDone={() => setShowSplash(false)} />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { hasOnboarded } = useOnboarding();
  const theme = useTheme();

  const legalScreenOptions = {
    headerShown: true,
    title: '',
    headerStyle: { backgroundColor: theme.bg },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasOnboarded} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cafe/[id]" />
        <Stack.Screen name="checkout" />
        {/* No swipe back: after paying, the only way on is "Done". */}
        <Stack.Screen name="order-sent/[id]" options={{ gestureEnabled: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!hasOnboarded} redirectTo="/">
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Screen name="terms" options={legalScreenOptions} />
      <Stack.Screen name="privacy" options={legalScreenOptions} />
    </Stack>
  );
}
