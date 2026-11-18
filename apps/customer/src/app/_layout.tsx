import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Shrikhand_400Regular } from '@expo-google-fonts/shrikhand';
import { NavigationTheme, useTheme } from '@shoot/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { SplashOverlay } from '@/components/splash-overlay';
import { useMovedCheck } from '@/hooks/use-moved-check';
import { CartProvider } from '@/providers/cart-provider';
import { LiveOrdersProvider } from '@/providers/live-orders-provider';
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
          <LiveOrdersProvider>
            <CartProvider>
              <RootNavigator />
            </CartProvider>
          </LiveOrdersProvider>
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
    <>
      {hasOnboarded && <MovedCheck />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={hasOnboarded} redirectTo="/welcome">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="cafe/[id]" />
          <Stack.Screen name="checkout" />
          {/* No swipe back: after paying, the only way on is "Done". */}
          <Stack.Screen name="order-sent/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="order/[id]" />
          {/* E10: a native sheet over whatever is open, sized to its content. */}
          <Stack.Screen
            name="moved/[id]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 28,
              contentStyle: { backgroundColor: theme.surface },
            }}
          />
          {/* Dark camera screens: light status bar. On iOS each screen sets its own, so
              expo-status-bar's <StatusBar> inside the screen isn't enough there. */}
          <Stack.Screen name="moved/photo" options={{ statusBarStyle: 'light' }} />
          <Stack.Screen name="change-phone" />
          <Stack.Screen name="change-code" />
          <Stack.Screen name="moved/scan" options={{ statusBarStyle: 'light' }} />
        </Stack.Protected>

        <Stack.Protected guard={!hasOnboarded} redirectTo="/">
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>

        <Stack.Screen name="terms" options={legalScreenOptions} />
        <Stack.Screen name="privacy" options={legalScreenOptions} />
      </Stack>
    </>
  );
}

/** E10: asks "Moved to a different seat?" when needed. Renders nothing. */
function MovedCheck() {
  useMovedCheck();
  return null;
}
