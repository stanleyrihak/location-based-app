import { CameraColors, Radius } from '@shoot/ui';
import { ActivityIndicator, View } from 'react-native';

/** The square to aim at, with the rest of the camera dimmed (`.qr-frame`). */
export function QrFrame({ checking }: { checking: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        // Slightly above the middle, like the design (top: 46%).
        paddingBottom: '8%',
      }}
    >
      <View
        style={{
          width: 230,
          aspectRatio: 1,
          borderRadius: Radius.card,
          borderWidth: 4,
          borderColor: CameraColors.ink,
          alignItems: 'center',
          justifyContent: 'center',
          // A huge shadow with no blur dims everything outside the frame.
          boxShadow: `0 0 0 1000px ${CameraColors.dim}`,
        }}
      >
        {checking && <ActivityIndicator color={CameraColors.ink} size="large" />}
      </View>
    </View>
  );
}
