import { formatCountdown, type Order, secondsToAccept } from '@shoot/shared';
import { ThemedText } from '@shoot/ui';
import { useEffect, useState } from 'react';

/**
 * The current time, updated every `intervalMs` while the component is on screen.
 * Reading Date.now() during render isn't allowed (render must be pure), so the time lives in
 * state and a timer moves it on.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** "4:05 left" to accept; orange in the last minute, "Time's up" at 0. */
export function Countdown({ order, now }: { order: Order; now: number }) {
  const seconds = secondsToAccept(order, now);
  if (seconds === null) return null;

  return (
    <ThemedText
      type="label"
      weight="semibold"
      color={seconds < 60 ? 'warning' : 'ink2'}
      style={{ fontVariant: ['tabular-nums'] }}
      accessibilityLabel={
        seconds > 0 ? `${Math.ceil(seconds / 60)} minutes left to accept` : 'Time to accept is up'
      }
    >
      {seconds > 0 ? `${formatCountdown(seconds)} left` : 'Time’s up'}
    </ThemedText>
  );
}
