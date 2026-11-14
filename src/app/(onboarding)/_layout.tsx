import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        title: '',
        headerStyle: { backgroundColor: theme.bg },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="phone-number" />
      <Stack.Screen name="sms-code" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="location-denied" />
    </Stack>
  );
}
