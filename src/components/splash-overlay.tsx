import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Wordmark, WORDMARK_RATIO } from '@/components/wordmark';
import { useTheme } from '@/hooks/use-theme';

const WORDMARK_WIDTH = 230;
const ART_RATIO = 609.663 / 720;

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1); // --ease-out
const ENTER_MS = 900; // --dur-enter
const HOLD_MS = 1800; // how long the splash stays before it fades
const FADE_MS = 300;

type Props = {
  onDone: () => void;
};

export function SplashOverlay({ onDone }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  const wordmarkHeight = WORDMARK_WIDTH / WORDMARK_RATIO;
  const centreTop = (height - wordmarkHeight) / 2;
  const finalTop = height * 0.19;

  const artWidth = width * 1.44;
  const artHeight = artWidth / ART_RATIO;

  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(1, { duration: ENTER_MS, easing: EASE_OUT });
    const timer = setTimeout(() => setLeaving(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, [progress]);

  useEffect(() => {
    if (!leaving) return;

    opacity.value = withTiming(0, { duration: FADE_MS });
    const timer = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving, opacity, onDone]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (centreTop - finalTop) }],
  }));

  const artStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.splashBg }, containerStyle]}
    >
      <StatusBar style="light" />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => setLeaving(true)}
        accessibilityRole="button"
        accessibilityLabel="Shoot. Tap to continue"
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: -width * 0.56,
              bottom: -height * 0.11,
              width: artWidth,
              height: artHeight,
            },
            artStyle,
          ]}
        >
          <Image
            source={require('@/assets/images/splash-selfie.svg')}
            contentFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        </Animated.View>

        <Animated.View
          style={[
            { position: 'absolute', top: finalTop, left: 0, right: 0, alignItems: 'center' },
            wordmarkStyle,
          ]}
        >
          <Wordmark width={WORDMARK_WIDTH} color="onSplash" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
