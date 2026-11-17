import { Pressable, View } from 'react-native';

import { CheckoutSteps } from '@/components/checkout-steps';
import { Icon } from '@/components/icon';

type Props = {
  onClose: () => void;
  /** "Close camera", "Close scanner". */
  closeLabel: string;
};

/** Close button and the compact steps, on the brown camera screens (`.cam-top`). */
export function CameraHeader({ onClose, closeLabel }: Props) {
  return (
    <View
      style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="x" size="xl" color="inkInverse" />
      </Pressable>
      <View style={{ flex: 1, paddingTop: 4, paddingHorizontal: 8 }}>
        <CheckoutSteps current={2} variant="camera" />
      </View>
      {/* Same width as the close button, so the steps stay centred. */}
      <View style={{ width: 44 }} />
    </View>
  );
}
