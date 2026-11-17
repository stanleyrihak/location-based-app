import { useTheme } from '@shoot/ui';
import { Stack } from 'expo-router';

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
      <Stack.Screen
        name="location-permission"
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
