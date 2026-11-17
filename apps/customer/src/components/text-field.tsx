import { useState } from 'react';
import {
  type FocusEvent,
  type BlurEvent,
  StyleSheet,
  TextInput,
  type TextInputProps,
} from 'react-native';

import { Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TextField({ style, onFocus, onBlur, ...other }: TextInputProps) {
  const theme = useTheme();

  const [focused, setFocused] = useState(false);

  function handleFocus(e: FocusEvent) {
    setFocused(true);
    onFocus?.(e);
  }

  function handleBlur(e: BlurEvent) {
    setFocused(false);
    onBlur?.(e);
  }

  return (
    <TextInput
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        styles.input,
        { borderColor: theme.lineStrong, color: theme.ink, backgroundColor: theme.surface },
        focused && { borderColor: theme.ink, boxShadow: `0 0 0 4px ${theme.focusGlow}` },
        style,
      ]}
      placeholderTextColor={theme.inkPlaceholder}
      {...other}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight,
  },
});
