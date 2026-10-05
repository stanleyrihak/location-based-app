import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { IconSize, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = SymbolViewProps['name'];

type IconProps = Omit<SymbolViewProps, 'name' | 'size' | 'tintColor'> & {
  name: IconName;
  size?: keyof typeof IconSize;
  color?: ThemeColor;
};

export function Icon({ name, size = 'md', color = 'text', ...rest }: IconProps) {
  const theme = useTheme();

  return <SymbolView name={name} size={IconSize[size]} tintColor={theme[color]} {...rest} />;
}
