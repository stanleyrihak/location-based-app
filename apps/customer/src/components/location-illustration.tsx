import { useTheme } from '@shoot/ui';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

const SIZE = 160;
const STROKE = 3;

type Props = {
  active?: boolean;
  accessibilityLabel: string;
};

export function LocationIllustration({ active = false, accessibilityLabel }: Props) {
  const theme = useTheme();
  const line = { stroke: theme.ink, strokeWidth: STROKE, strokeLinecap: 'round' as const };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        backgroundColor: theme.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width="70%" height="70%" viewBox="0 0 160 160">
        <Ellipse cx={80} cy={128} rx={58} ry={12} fill="none" strokeDasharray="2 9" {...line} />
        <Path
          d="M80 124c-5-7-36-38-36-64a36 36 0 0 1 72 0c0 26-31 57-36 64z"
          fill={theme.bg}
          strokeLinejoin="round"
          {...line}
        />
        {active ? (
          <Circle cx={80} cy={60} r={13} fill={theme.accent} />
        ) : (
          <Circle cx={80} cy={60} r={13} fill="none" {...line} />
        )}
      </Svg>
    </View>
  );
}
