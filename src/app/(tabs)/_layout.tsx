import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabButton } from '@/components/tab-button';
import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={{
          backgroundColor: theme.surfaceTabbar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.line,
          paddingTop: 8,
          paddingHorizontal: 8,
          paddingBottom: insets.bottom,
        }}
      >
        <TabTrigger name="home" href="/" asChild>
          <TabButton icon="home" label="Home" />
        </TabTrigger>
        <TabTrigger name="orders" href="/orders" asChild>
          <TabButton icon="receipt" label="Orders" />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton icon="user" label="Profile" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
