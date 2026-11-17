import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Radius } from '@/constants/theme';
import type { Coordinates } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { offsetInMetres } from '@/utils/geo';

const WIDTH = 300;
const HEIGHT = 220;
const CAFE_X = WIDTH / 2;
const CAFE_Y = HEIGHT / 2;
/** The delivery ring is always drawn this big; the metres are scaled to fit it. */
const RING_RADIUS = 80;

type Props = {
  cafe: Coordinates;
  /** Undefined while the location is loading: the map shows the café only. */
  user: Coordinates | undefined;
  radiusM: number;
  accessibilityLabel: string;
};

/**
 * A drawn map (`.map` in the design), not a real one: café in the middle, its delivery ring,
 * and you. The streets are decoration, but your pin is placed for real, from how far north
 * and east of the café you are. A real map (expo-maps) can replace this later.
 */
export function SpotMap({ cafe, user, radiusM, accessibilityLabel }: Props) {
  const theme = useTheme();

  let pin: { x: number; y: number } | undefined;
  if (user) {
    const { northM, eastM } = offsetInMetres(cafe, user);
    const pxPerMetre = RING_RADIUS / radiusM;
    pin = {
      // Kept inside the map, so someone far away still shows at the edge, not off it.
      x: clamp(CAFE_X + eastM * pxPerMetre, 12, WIDTH - 12),
      // North is up, but SVG y grows downwards, hence the minus.
      y: clamp(CAFE_Y - northM * pxPerMetre, 12, HEIGHT - 12),
    };
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{
        aspectRatio: WIDTH / HEIGHT,
        borderRadius: Radius.input,
        overflow: 'hidden',
        backgroundColor: theme.mapLand,
      }}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Path fill={theme.mapPark} d="M-10 150c50-18 96 0 124 80H-10Z" />
        <Path fill={theme.mapPark} d="M250 -10c10 34 50 52 110 44V-10Z" />
        <Road width={12} d="M-10 64c100 14 240-16 370 4" />
        <Road width={7} d="M196-10c-8 70 14 140 4 240" />
        <Road width={5} d="M-10 190c80-8 150 4 220-6" />
        <Circle
          cx={CAFE_X}
          cy={CAFE_Y}
          r={RING_RADIUS}
          fill="none"
          stroke={theme.success}
          strokeWidth={2}
          strokeDasharray={[3, 3.2]}
        />
        <Circle
          cx={CAFE_X}
          cy={CAFE_Y}
          r={6}
          fill={theme.ink}
          stroke={theme.surface}
          strokeWidth={2}
        />
        {pin && (
          <>
            <Circle cx={pin.x} cy={pin.y} r={18} fill={theme.mapHalo} />
            <Circle
              cx={pin.x}
              cy={pin.y}
              r={8}
              fill={theme.accent}
              stroke={theme.surface}
              strokeWidth={3}
            />
          </>
        )}
      </Svg>
    </View>
  );
}

function Road({ d, width }: { d: string; width: number }) {
  const theme = useTheme();
  return (
    <Path d={d} fill="none" stroke={theme.mapRoad} strokeWidth={width} strokeLinecap="round" />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
