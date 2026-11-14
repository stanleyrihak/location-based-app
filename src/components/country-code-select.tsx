import { type MenuAction, MenuView } from '@expo/ui/community/menu';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const COUNTRIES = [
  { code: 'FI', name: 'Finland', dial: '+358' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'EE', name: 'Estonia', dial: '+372' },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];

type Props = {
  value: CountryCode;
  onChange: (code: CountryCode) => void;
};

export function CountryCodeSelect({ value, onChange }: Props) {
  const theme = useTheme();
  const selected = COUNTRIES.find((country) => country.code === value) ?? COUNTRIES[0];

  const items: MenuAction[] = COUNTRIES.map((country) => ({
    id: country.code,
    title: `${country.name} (${country.dial})`,
    state: country.code === value ? 'on' : 'off',
  }));

  function handlePressAction(code: string) {
    const country = COUNTRIES.find((item) => item.code === code);

    if (!country) {
      return;
    }

    onChange(country.code);
  }

  return (
    <MenuView
      actions={items}
      onPressAction={({ nativeEvent }) => handlePressAction(nativeEvent.event)}
      colorScheme="light"
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Country code: ${selected.name} ${selected.dial}`}
        style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.lineStrong }]}
      >
        <ThemedText weight="medium" style={styles.dial}>
          {selected.dial}
        </ThemedText>
        <Icon name="chev-d" size="sm" />
      </View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: Radius.input,
    borderWidth: 1.5,
  },
  dial: {
    fontVariant: ['tabular-nums'],
  },
});
