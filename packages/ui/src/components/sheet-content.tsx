import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * The content of a form sheet that fits its content (`sheetAllowedDetents: 'fitToContents'`).
 *
 * The bottom padding is the sheet's own safe area, not the screen's. On newer iPhones a small
 * sheet floats above the bottom edge, clear of the home indicator, so the screen's inset
 * (useSafeAreaInsets) would add about 34 points of empty space under the last button.
 * SafeAreaView measures where this view really is: 0 when the sheet floats, the home
 * indicator or navigation bar when it touches the bottom. The style's padding is added on top.
 */
export function SheetContent({
  style,
  children,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <SafeAreaView edges={['bottom']} style={[{ paddingTop: 28, paddingBottom: 8 }, style]}>
      {children}
    </SafeAreaView>
  );
}
