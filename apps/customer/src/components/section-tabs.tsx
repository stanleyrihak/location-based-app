import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props<T extends string> = {
  tabs: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
  /** Screen side padding. The row bleeds to the screen edges and pads itself back in. */
  gutter: number;
  accessibilityLabel: string;
};

/**
 * Text tabs with an accent underline (`.tabs` / `.tab-link` in the design).
 * Generic over the id type, so the screen gets its own ids back, not plain strings.
 */
export function SectionTabs<T extends string>({
  tabs,
  selected,
  onSelect,
  gutter,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();

  return (
    <View
      style={{
        marginHorizontal: -gutter,
        borderBottomWidth: 1,
        borderBottomColor: theme.line,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        contentContainerStyle={{ gap: 24, paddingHorizontal: gutter }}
      >
        {tabs.map(({ id, label }) => {
          const isSelected = id === selected;
          return (
            <Pressable
              key={id}
              onPress={() => onSelect(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingVertical: 12,
                // Sits on top of the row's bottom line, so the selected one covers it.
                marginBottom: -1,
                borderBottomWidth: 3,
                borderBottomColor: isSelected ? theme.accent : 'transparent',
              }}
            >
              <ThemedText
                weight={isSelected ? 'semibold' : 'medium'}
                color={isSelected ? 'ink' : 'ink2'}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
