import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Shrikhand_400Regular } from '@expo-google-fonts/shrikhand';
import { useFonts } from 'expo-font';
import { ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { NavigationTheme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
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

  // Hide the splash screen once fonts are ready; on error, fall back to system fonts.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={NavigationTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
