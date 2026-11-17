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
import * as Notifications from 'expo-notifications';
import { router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';

// Defines the background location task when the app starts, before anything renders.
import '@/location/share-position';
import { SharePositionProvider } from '@/location/share-position-provider';
import { setUpNotifications } from '@/notifications/new-order-alert';
import { LiveOrdersProvider } from '@/providers/live-orders-provider';
import { SessionProvider, useSession } from '@/providers/session-provider';

SplashScreen.preventAutoHideAsync();
// How notifications look and sound in this app; once, before anything can ring.
setUpNotifications();

// Created once, outside the component: it holds the cache, so it must survive re-renders.
const queryClient = new QueryClient();

/** The seller app: the same fonts and theme as the customer app, its own screens. */
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NavigationTheme}>
        <SessionProvider>
          <LiveOrdersProvider>
            <SharePositionProvider>
              <RootNavigator />
            </SharePositionProvider>
          </LiveOrdersProvider>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { signedIn } = useSession();
  const theme = useTheme();

  // Tapping a "New order" notification opens that order. The hook also has the tap that
  // started the app from closed, which a listener added after start-up would miss. The ref
  // keeps one tap from opening the order again (for example after signing in again).
  const lastResponse = Notifications.useLastNotificationResponse();
  const openedTap = useRef<string | null>(null);
  useEffect(() => {
    if (!signedIn || !lastResponse) return;
    const tap = lastResponse.notification.request.identifier;
    if (openedTap.current === tap) return;
    openedTap.current = tap;
    const { orderId } = lastResponse.notification.request.content.data as { orderId?: string };
    if (orderId) router.push({ pathname: '/order/[id]', params: { id: orderId } });
  }, [signedIn, lastResponse]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Signed in: the café's tabs. Signed out: only sign-in. Expo Router switches by itself. */}
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/[id]" />
        {/* A native sheet over the order, sized to its content, like the customer's pay sheet. */}
        <Stack.Screen
          name="decline/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: theme.bg },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
