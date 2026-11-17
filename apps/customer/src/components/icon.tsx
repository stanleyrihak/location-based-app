import Svg from 'react-native-svg';

import { type IconName, IconShapes } from '@/components/icon-shapes';
import { IconSize, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type { IconName };

type IconProps = {
  name: IconName;
  size?: keyof typeof IconSize;
  color?: ThemeColor;
  bold?: boolean;
};

export function Icon({ name, size = 'lg', color = 'ink', bold = false }: IconProps) {
  const theme = useTheme();
  const px = IconSize[size];

  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={theme[color]}
      strokeWidth={bold ? 2.4 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {IconShapes[name]}
    </Svg>
  );
}
