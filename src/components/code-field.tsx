import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ADVANCE_DELAY_MS = 450;

type Props = {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
};

export function CodeField({ value, onChange, onComplete, length = 6 }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value.length !== length || !onComplete) {
      return;
    }

    const timer = setTimeout(() => onComplete(value), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [value, length, onComplete]);

  function handleChangeText(text: string) {
    onChange(text.replace(/\D/g, '').slice(0, length));
  }

  return (
    <View>
      <View
        style={styles.row}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length;
          const active = focused && i === value.length;

          return (
            <View
              key={i}
              style={[
                styles.box,
                { backgroundColor: theme.surface, borderColor: theme.lineStrong },
                filled && { borderColor: theme.ink },
                active && { borderColor: theme.ink, boxShadow: `0 0 0 4px ${theme.focusGlow}` },
              ]}
            >
              <ThemedText weight="semibold" style={styles.digit}>
                {value[i]}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <TextInput
        value={value}
        onChangeText={handleChangeText}
        maxLength={length}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        autoFocus
        caretHidden
        selection={{ start: value.length, end: value.length }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`${length}-digit code`}
        style={[StyleSheet.absoluteFill, styles.hiddenInput]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  box: {
    flex: 1,
    aspectRatio: 5 / 6,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.otp,
    borderWidth: 1.5,
  },
  digit: {
    fontSize: 24,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  hiddenInput: {
    opacity: 0,
  },
});
