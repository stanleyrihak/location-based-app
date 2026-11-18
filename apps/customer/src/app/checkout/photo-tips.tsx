import { Button, ThemedText, SheetContent } from '@shoot/ui';
import { router } from 'expo-router';

import { ExamplePhoto } from '@/components/example-photo';

/**
 * 2.4c A good photo: a form sheet over the camera (set up in checkout/_layout.tsx).
 * Sized to its content, so nothing here uses flex: 1.
 */
export default function PhotoTipsSheet() {
  return (
    <SheetContent style={{ paddingHorizontal: 20, gap: 14 }}>
      <ThemedText type="title" weight="bold" accessibilityRole="header">
        {'A good photo'}
      </ThemedText>
      <ExamplePhoto />
      <ThemedText color="ink2">
        {
          'Your face, and something the courier can spot: a bench, a sign, a tree. Leave other people out.'
        }
      </ThemedText>
      <Button onPress={() => router.back()} style={{ marginTop: 4 }}>
        {'Got it'}
      </Button>
    </SheetContent>
  );
}
