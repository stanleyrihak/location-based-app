import type { Order } from '@shoot/shared';
import { Button, CallButton, CameraColors, ThemedText } from '@shoot/ui';
import { View } from 'react-native';

import { OrderChangedError, SpotNotValidError } from '@/data/api';
import { OutOfRangeError } from '@/data/use-check-range';

/** What went wrong with a new spot, in the app's words (E10). */
export function movedErrorText(error: unknown, order: Order) {
  if (error instanceof OutOfRangeError) {
    return `That’s outside ${order.cafeName}’s delivery area. Call them, or go back to your first spot.`;
  }
  if (error instanceof SpotNotValidError) {
    return `That code isn’t a spot of ${order.cafeName}. Scan the code at your seat.`;
  }
  if (error instanceof OrderChangedError) {
    return 'This order changed in the meantime, so the spot can’t change any more.';
  }
  return 'The new spot didn’t save. Check your connection and try again.';
}

/**
 * Under the camera when a new spot was refused: the reason, Try again, and Call (the café can
 * still find you by phone when the new seat is out of range).
 */
export function MovedError({
  error,
  order,
  onRetry,
}: {
  error: unknown;
  order: Order;
  onRetry: () => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <ThemedText style={{ color: CameraColors.ink }} accessibilityRole="alert">
        {movedErrorText(error, order)}
      </ThemedText>
      {!(error instanceof OrderChangedError) && (
        <Button camera onPress={onRetry}>
          {'Try again'}
        </Button>
      )}
      <CallButton phone={order.cafePhone} label={`Call ${order.cafeName}`} />
    </View>
  );
}
