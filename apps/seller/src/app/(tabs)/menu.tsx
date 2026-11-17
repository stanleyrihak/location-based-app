import type { MenuItem, MenuSection } from '@shoot/shared';
import { ThemedText, ThemedView, useTheme } from '@shoot/ui';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMenu } from '@/data/queries';
import { useUpdateMenuItem } from '@/data/use-menu-item';
import { formatPrice } from '@/utils/format';

const GUTTER = 24;

const SECTIONS: { section: MenuSection; title: string }[] = [
  { section: 'coffee', title: 'Coffee' },
  { section: 'tea', title: 'Tea' },
  { section: 'pastry', title: 'Pastries' },
  { section: 'lunch', title: 'Lunch' },
];

/**
 * The Menu tab: what's available right now. The switch marks an item sold out (customers can't
 * order it); tapping the row edits its price and description.
 */
export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const menu = useMenu();

  if (menu.isPending) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const items = menu.data ?? [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: GUTTER,
          paddingBottom: 24,
          gap: 24,
        }}
      >
        <ThemedText type="headlineLarge" accessibilityRole="header">
          {'Menu'}
        </ThemedText>

        {menu.isError && (
          <ThemedText color="ink2">
            {'We couldn’t load your menu. Try again in a moment.'}
          </ThemedText>
        )}

        {SECTIONS.map(({ section, title }) => {
          const inSection = items.filter((item) => item.section === section);
          if (inSection.length === 0) return null;
          return (
            <View key={section} style={{ gap: 4 }}>
              <ThemedText type="title" weight="bold" accessibilityRole="header">
                {title}
              </ThemedText>
              {inSection.map((item) => (
                <MenuRow key={item.id} item={item} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const theme = useTheme();
  const update = useUpdateMenuItem(item.id);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      }}
    >
      <Pressable
        onPress={() => router.push({ pathname: '/menu-item/[id]', params: { id: item.id } })}
        accessibilityRole="button"
        accessibilityHint="Edit the price and description"
        style={{ flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' }}
      >
        <ThemedText weight="semibold" color={item.soldOut ? 'ink2' : undefined}>
          {item.name}
        </ThemedText>
        <ThemedText type="subhead" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
          {item.soldOut
            ? `${formatPrice(item.priceCents)} · Sold out`
            : formatPrice(item.priceCents)}
        </ThemedText>
        {update.isError && (
          <ThemedText type="caption" color="error" accessibilityRole="alert">
            {'Didn’t save. Try again.'}
          </ThemedText>
        )}
      </Pressable>
      <Switch
        value={!item.soldOut}
        onValueChange={(available) => update.mutate({ soldOut: !available })}
        accessibilityLabel={`${item.name} available`}
        trackColor={{ true: theme.success, false: theme.lineStrong }}
      />
    </View>
  );
}
