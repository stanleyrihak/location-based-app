import { TabButton, useTheme } from '@shoot/ui';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Orders and Stand. The same tab bar as the customer app (TabButton from @shoot/ui). */
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
        <TabTrigger name="orders" href="/" asChild>
          <TabButton icon="receipt" label="Orders" />
        </TabTrigger>
        <TabTrigger name="stand" href="/stand" asChild>
          <TabButton icon="store" label="Stand" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}
