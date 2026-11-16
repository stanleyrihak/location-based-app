import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { TextField } from '@/components/text-field';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

/** Search input with a magnifier on the left (`.search` in the design). */
export function SearchField({ value, onChangeText, placeholder }: Props) {
  const theme = useTheme();

  return (
    <View>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        // iOS draws an × to empty the field while you type.
        clearButtonMode="while-editing"
        style={{
          paddingLeft: 48,
          backgroundColor: theme.surfaceSearch,
          borderColor: 'transparent',
        }}
      />
      {/* On top of the input, but taps pass through to it. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' }}
      >
        <Icon name="search" color="ink2" />
      </View>
    </View>
  );
}
