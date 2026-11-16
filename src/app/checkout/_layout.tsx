import { Stack } from 'expo-router';

/**
 * Its own stack, so the whole checkout (cart, spot, photos, payment) is one unit:
 * after paying, the app can close all of it at once instead of popping screen by screen.
 * No native headers: these screens draw their own back button and big title (`.nav-inline`).
 */
export default function CheckoutLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
