import { ThemedText, Radius, Shadow, useTheme } from '@shoot/ui';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { NearbyCafe } from '@/data/queries';
import { formatDistance, formatPrice } from '@/utils/format';

type Props = {
  cafe: NearbyCafe;
  onPress: () => void;
};

/** Café card from the design (`.cafe`, and `.cafe.out` when out of range). */
export function CafeCard({ cafe, onPress }: Props) {
  const theme = useTheme();
  const distance = `${formatDistance(cafe.distanceM)} away`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        cafe.inRange
          ? `${cafe.name}, ${distance}, ready in about ${cafe.readyInMin} minutes`
          : `${cafe.name}, ${distance}, out of range, browse only`
      }
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 12,
          paddingRight: 16,
          borderRadius: Radius.card,
          borderWidth: 1.5,
        },
        cafe.inRange
          ? { backgroundColor: theme.surface, borderColor: 'transparent', boxShadow: Shadow.card }
          : { borderColor: theme.lineStrong },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: Radius.thumb,
          overflow: 'hidden',
          backgroundColor: cafe.inRange ? theme.surface2 : theme.surfaceMuted,
        }}
      >
        <Image source={cafe.image} contentFit="cover" style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText weight="bold" style={{ lineHeight: 21 }}>
          {cafe.name}
        </ThemedText>
        <MetaLine
          strong={distance}
          rest={cafe.inRange ? `Open until ${cafe.openUntil}` : undefined}
        />
        {cafe.inRange ? (
          <MetaLine
            strong={`Ready in ~${cafe.readyInMin} min`}
            rest={`Delivery ${formatPrice(cafe.deliveryFeeCents)}`}
          />
        ) : (
          <MoveCloser />
        )}
      </View>
    </Pressable>
  );
}

/** One meta row: a bold part, then a lighter part. Wraps between the parts, never inside one. */
function MetaLine({ strong, rest }: { strong: string; rest?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }}>
      <ThemedText type="subhead" weight="semibold" style={META_TEXT}>
        {strong}
      </ThemedText>
      {rest && (
        <ThemedText type="subhead" color="ink2" style={META_TEXT}>
          {rest}
        </ThemedText>
      )}
    </View>
  );
}

const META_TEXT = { lineHeight: 20, fontVariant: ['tabular-nums'] } as const;

/** The dashed range ring (`.ring.out`) with its hint. */
function MoveCloser() {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle
          cx={11}
          cy={11}
          r={9}
          fill="none"
          stroke={theme.ink2}
          strokeWidth={2}
          strokeDasharray={[3, 3.2]}
        />
        <Circle cx={11} cy={11} r={3.5} fill="none" stroke={theme.ink2} strokeWidth={2} />
      </Svg>
      <ThemedText type="subhead" weight="semibold">
        {'Move closer to order'}
      </ThemedText>
    </View>
  );
}
