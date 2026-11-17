import { TabButton, useTheme } from '@shoot/ui';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={{
          backgroundColor: theme.surfaceTabbar,
          borderTopWidth: 1,
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
