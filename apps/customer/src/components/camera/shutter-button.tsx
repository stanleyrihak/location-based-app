import { Pressable, View } from 'react-native';

import { CameraColors } from '@/constants/theme';

type Props = {
  onPress: () => void;
  /** "Take selfie", "Take photo of your spot". */
  accessibilityLabel: string;
  disabled?: boolean;
};

/** The round shutter: a cream ring with a cream disc that shrinks while pressed (`.shutter`). */
export function ShutterButton({ onPress, accessibilityLabel, disabled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: CameraColors.ink,
        padding: 4,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {({ pressed }) => (
        <View
          style={{
            flex: 1,
            borderRadius: 999,
            backgroundColor: CameraColors.ink,
            transform: [{ scale: pressed ? 0.9 : 1 }],
          }}
        />
      )}
    </Pressable>
  );
}
