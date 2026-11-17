import { Image } from 'expo-image';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Radius } from '@/constants/theme';
import type { MenuSection } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

/** What a product without a photo shows instead, by menu section. */
const PLACEHOLDER_ICON: Record<MenuSection, IconName> = {
  coffee: 'cup',
  tea: 'leaf',
  pastry: 'croissant',
  lunch: 'soup',
};

type Props = {
  image: number | string | undefined;
  /** Picks the placeholder icon when there's no photo. */
  section: MenuSection;
  /** Sold-out products are faded and nearly grey (`.menu-row.sold .thumb`). */
  muted?: boolean;
};

/**
 * The 72 pt product tile, the same size everywhere: menu rows and cart rows.
 * Always takes its full space, photo or not, so the buttons next to it line up row to row.
 */
export function ProductThumb({ image, section, muted = false }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: Radius.thumb,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.surface2,
        opacity: muted ? 0.5 : 1,
      }}
    >
      {image === undefined ? (
        // Decorative: VoiceOver already reads the product name next to it.
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name={PLACEHOLDER_ICON[section]} size="thumb" color="ink2" />
        </View>
      ) : (
        <Image
          source={image}
          contentFit="cover"
          style={[{ width: '100%', height: '100%' }, muted && { filter: [{ grayscale: 0.8 }] }]}
        />
      )}
    </View>
  );
}
