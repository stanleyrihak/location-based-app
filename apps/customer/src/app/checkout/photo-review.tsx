import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CameraHeader } from '@/components/camera/camera-header';
import { CameraNote, Viewfinder } from '@/components/camera/viewfinder';
import { CameraColors, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCheckout } from '@/providers/checkout-provider';

/** 2.5 Happy with this photo? Your spot big, the selfie in the corner. */
export default function PhotoReviewScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { photos, setPhotos } = useCheckout();

  // Nothing to review (for example after a reload during development): back to the camera.
  if (!photos) {
    return <Redirect href="/checkout/photo" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: CameraColors.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />
      <CameraHeader onClose={() => router.back()} closeLabel="Close camera" />

      <View
        style={{ flex: 1 }}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Your photos: you, and the spot where you’re sitting"
      >
        <Viewfinder>
          <Image source={photos.spot} contentFit="cover" style={{ flex: 1 }} />
          <View
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 110,
              aspectRatio: 11 / 15,
              borderRadius: Radius.input,
              overflow: 'hidden',
              backgroundColor: theme.bg,
              boxShadow: `0 0 0 3px ${theme.surface}`,
            }}
          >
            <Image source={photos.selfie} contentFit="cover" style={{ flex: 1 }} />
          </View>
        </Viewfinder>
      </View>

      <CameraNote
        lead="Happy with this photo?"
        text="Your face and your spot should both be clear."
      />

      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 8,
        }}
      >
        <Button
          variant="secondary"
          camera
          style={{ flex: 1, paddingHorizontal: 12 }}
          onPress={() => {
            setPhotos(null);
            // A fresh camera in place of this screen, starting again with the selfie.
            router.replace('/checkout/photo');
          }}
        >
          {'Retake'}
        </Button>
        <Button
          camera
          style={{ flex: 1, paddingHorizontal: 12 }}
          onPress={() => router.push('/checkout/payment')}
        >
          {'Use photo'}
        </Button>
      </View>
    </View>
  );
}
