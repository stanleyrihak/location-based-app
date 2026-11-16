import { Fragment } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const STEPS = ['Cart', 'Spot', 'Payment'] as const;

type Props = {
  /** 1 to 3. Steps before it show a tick, steps after it are grey. */
  current: 1 | 2 | 3;
};

/** "1 Cart — 2 Spot — 3 Payment" at the top of 2.2, 2.3 and 2.7 (`.steps`). */
export function CheckoutSteps({ current }: Props) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`Step ${current} of ${STEPS.length}: ${STEPS[current - 1]}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
    >
      {STEPS.map((label, index) => {
        const number = index + 1;
        const state = number < current ? 'done' : number === current ? 'current' : 'todo';

        return (
          <Fragment key={label}>
            {index > 0 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 3,
                  // Lines up with the circles, not with the labels under them.
                  marginBottom: 24,
                  backgroundColor: number <= current ? theme.ink : theme.lineStrong,
                }}
              />
            )}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: state === 'todo' ? theme.lineStrong : theme.ink,
                  backgroundColor:
                    state === 'done'
                      ? theme.ink
                      : state === 'current'
                        ? theme.surface
                        : 'transparent',
                }}
              >
                {state === 'done' ? (
                  <Icon name="check" size="xs" color="inkInverse" bold />
                ) : (
                  <ThemedText
                    type="subhead"
                    weight="bold"
                    color={state === 'current' ? 'ink' : 'ink2'}
                  >
                    {number}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                type="caption"
                weight={state === 'current' ? 'semibold' : undefined}
                color={state === 'current' ? 'ink' : 'ink2'}
              >
                {label}
              </ThemedText>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
