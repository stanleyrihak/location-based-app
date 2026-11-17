import { useTheme } from '@shoot/ui';
import { Stack } from 'expo-router';

import { CheckoutProvider } from '@/providers/checkout-provider';

/**
 * Its own stack, so the whole checkout (cart, spot, photos, payment) is one unit:
 * after paying, the app can close all of it at once instead of popping screen by screen.
 * No native headers: these screens draw their own back button and big title (`.nav-inline`).
 */
export default function CheckoutLayout() {
  const theme = useTheme();

  return (
    <CheckoutProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="spot-map"
          options={{
            // A native iOS sheet over 2.3 (2.3b), sized to its content, with a grabber.
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: theme.surface },
          }}
        />
        <Stack.Screen
          name="photo-tips"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: theme.surface },
          }}
        />
        <Stack.Screen
          name="pay-sheet"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
            // Cream, so the white payment row and summary stand out on it.
            contentStyle: { backgroundColor: theme.bg },
          }}
        />
        {/* The camera screens slide up, like the system camera, instead of in from the side. */}
        <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="photo" options={{ animation: 'slide_from_bottom' }} />
        {/* Replaces the camera in place, so a cross-fade reads better than a slide. */}
        <Stack.Screen name="photo-review" options={{ animation: 'fade' }} />
      </Stack>
    </CheckoutProvider>
  );
}
