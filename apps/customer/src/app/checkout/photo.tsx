import { Icon, CameraColors, Radius, useTheme } from '@shoot/ui';
import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraHeader } from '@/components/camera/camera-header';
import { ShutterButton } from '@/components/camera/shutter-button';
import { CameraNote, Viewfinder, ViewfinderHint } from '@/components/camera/viewfinder';
import { CameraAccessDenied } from '@/components/camera-access-denied';
import { useNearbyCafe } from '@/data/queries';
import { useCameraAccess } from '@/hooks/use-camera-access';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';

/** 2.4 and 2.4b: two taps. The first takes a selfie, the second your spot. */
export default function PhotoScreen() {
  const access = useCameraAccess();

  if (access === 'loading') {
    return <View style={{ flex: 1, backgroundColor: CameraColors.bg }} />;
  }
  if (access === 'denied') {
    return (
      <CameraAccessDenied
        title="Why we need a photo"
        text="Your photo is your proof of location: it shows the café it’s really you and where you’re sitting. They need it to accept your order and to find you. It’s only shared with the café for this order."
        backLabel="Back to confirm your spot"
      />
    );
  }
  return <TwoShotCamera />;
}

function TwoShotCamera() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const { setPhotos } = useCheckout();
  const isFocused = useIsFocused();

  // A ref gives us the camera component itself, so we can call its takePictureAsync().
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  /** The selfie once taken. Its presence is what moves us from shot 1 to shot 2. */
  const [selfie, setSelfie] = useState<string | null>(null);

  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const cafeName = cafe?.name ?? 'the café';
  const shot = selfie === null ? 'selfie' : 'spot';

  async function takePicture() {
    if (!camera.current || taking) return;
    setTaking(true);
    // A quick white flash, so it's clear the picture was taken.
    flash.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 240 })));
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.7 });
      if (shot === 'selfie') {
        setSelfie(picture.uri);
      } else if (selfie) {
        finish(selfie, picture.uri);
      }
    } catch {
      Alert.alert('Couldn’t take the photo', 'Please try again.');
    } finally {
      setTaking(false);
    }
  }

  function finish(selfieUri: string | number, spotUri: string | number) {
    setPhotos({ selfie: selfieUri, spot: spotUri });
    // Replace, so the review sits where the camera was: "Retake" opens a fresh camera,
    // and "back" from payment goes to the review, not to a camera with an old selfie.
    router.replace('/checkout/photo-review');
  }

  return (
    <View style={{ flex: 1, backgroundColor: CameraColors.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />
      <CameraHeader onClose={() => router.back()} closeLabel="Close camera" />

      <Viewfinder>
        <CameraView
          ref={camera}
          style={{ flex: 1 }}
          // The same camera view switches lens: front for the selfie, back for the spot.
          facing={shot === 'selfie' ? 'front' : 'back'}
          // Saves the selfie the way you saw it on screen, like the iPhone camera does.
          mirror={shot === 'selfie'}
          active={isFocused}
          onCameraReady={() => setReady(true)}
        />
        {selfie && <SelfieInset uri={selfie} onRetake={() => setSelfie(null)} />}
        <ViewfinderHint text={shot === 'selfie' ? 'First, a selfie' : 'Now your spot'} />
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#fff' },
            flashStyle,
          ]}
        />
      </Viewfinder>

      <CameraNote
        text={
          shot === 'selfie'
            ? `Then your spot. Only ${cafeName} sees both, for this order.`
            : 'Selfie taken. Now show where you’re sitting.'
        }
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 16,
          paddingHorizontal: 32,
          paddingBottom: insets.bottom + 8,
        }}
      >
        {/* Equal space on both sides keeps the shutter in the exact middle. */}
        <View style={{ flex: 1 }} />
        <ShutterButton
          onPress={takePicture}
          disabled={!ready || taking}
          accessibilityLabel={shot === 'selfie' ? 'Take selfie' : 'Take photo of your spot'}
        />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Pressable
            onPress={() => router.push('/checkout/photo-tips')}
            accessibilityRole="button"
            accessibilityLabel="Tips for a good photo"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: CameraColors.ink2,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Icon name="help" color="inkInverse" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** The selfie, small in the corner, with a tick. Tap it to take it again (`.pip`). */
function SelfieInset({ uri, onRetake }: { uri: string; onRetake: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onRetake}
      accessibilityRole="button"
      accessibilityLabel="Your selfie is taken. Tap to retake it."
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
      <Image source={uri} contentFit="cover" style={{ flex: 1 }} />
      <View
        style={{
          position: 'absolute',
          right: 6,
          bottom: 6,
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.success,
        }}
      >
        <Icon name="check" size="sm" color="onSuccess" bold />
      </View>
    </Pressable>
  );
}
