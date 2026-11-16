import { Link, type LinkProps } from 'expo-router';
import { StyleSheet } from 'react-native';

import { FontWeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TextLink({ children, style, ...other }: LinkProps) {
  const theme = useTheme();

  return (
    <Link style={[styles.link, { color: theme.primary }, style]} {...other}>
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    textDecorationLine: 'underline',
    fontWeight: FontWeight.semibold,
  },
});
