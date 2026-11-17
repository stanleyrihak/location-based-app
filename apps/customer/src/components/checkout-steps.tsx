import { Icon, CameraColors, FontWeight, Typography, useTheme } from '@shoot/ui';
import { Fragment } from 'react';
import { Text, View } from 'react-native';

const STEPS = ['Cart', 'Spot', 'Payment'] as const;

type Props = {
  /** 1 to 3. Steps before it show a tick, steps after it are grey. */
  current: 1 | 2 | 3;
  /**
   * `camera`: smaller, cream on brown, for the camera headers (`.cam .steps.compact`).
   * The look is picked from one table of colours and sizes, so the layout code stays shared.
   */
  variant?: 'default' | 'camera';
};

/** "1 Cart — 2 Spot — 3 Payment" at the top of the checkout screens (`.steps`). */
export function CheckoutSteps({ current, variant = 'default' }: Props) {
  const theme = useTheme();

  const look =
    variant === 'camera'
      ? {
          strong: CameraColors.ink,
          faint: CameraColors.ink2,
          doneFill: CameraColors.ink,
          currentFill: 'transparent',
          tick: 'ink' as const, // brown tick on the cream circle
          circle: 24,
          border: 1.5,
          gap: 4,
          number: Typography.caption.fontSize,
          label: Typography.micro,
          barOffset: 18,
        }
      : {
          strong: theme.ink,
          faint: theme.lineStrong,
          doneFill: theme.ink,
          currentFill: theme.surface,
          tick: 'inkInverse' as const,
          circle: 32,
          border: 2,
          gap: 6,
          number: Typography.subhead.fontSize,
          label: Typography.caption,
          barOffset: 24,
        };
  // Grey text is a bit darker than grey lines on the light screens, so it stays readable.
  const faintText = variant === 'camera' ? CameraColors.ink2 : theme.ink2;

  return (
    <View
      accessible
      accessibilityLabel={`Step ${current} of ${STEPS.length}: ${STEPS[current - 1]}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: variant === 'camera' ? 6 : 8 }}
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
                  marginBottom: look.barOffset,
                  backgroundColor: number <= current ? look.strong : look.faint,
                }}
              />
            )}
            <View style={{ alignItems: 'center', gap: look.gap }}>
              <View
                style={{
                  width: look.circle,
                  height: look.circle,
                  borderRadius: look.circle / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: look.border,
                  borderColor: state === 'todo' ? look.faint : look.strong,
                  backgroundColor:
                    state === 'done'
                      ? look.doneFill
                      : state === 'current'
                        ? look.currentFill
                        : 'transparent',
                }}
              >
                {state === 'done' ? (
                  <Icon name="check" size="xs" color={look.tick} bold />
                ) : (
                  <Text
                    style={{
                      fontFamily: Typography.subhead.fontFamily,
                      fontSize: look.number,
                      fontWeight: FontWeight.bold,
                      color: state === 'current' ? look.strong : faintText,
                    }}
                  >
                    {number}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  look.label,
                  {
                    fontWeight: state === 'current' ? FontWeight.semibold : look.label.fontWeight,
                    color: state === 'current' ? look.strong : faintText,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
