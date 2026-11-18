import { CameraColors } from '@shoot/ui';
import { CameraView } from 'expo-camera';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraHeader } from '@/components/camera/camera-header';
import { ShutterButton } from '@/components/camera/shutter-button';
import { CameraNote, Viewfinder, ViewfinderHint } from '@/components/camera/viewfinder';
import { CameraAccessDenied } from '@/components/camera-access-denied';
import { MovedError } from '@/components/moved-error';
import { useOrders } from '@/data/queries';
import { useCameraAccess } from '@/hooks/use-camera-access';
import { useUpdateSpot } from '@/hooks/use-update-spot';

/** E10, new spot photo: one tap with the back camera. The selfie from the order stays. */
export default function MovedPhotoScreen() {
  const access = useCameraAccess();
  if (access === 'loading') {
    return <View style={{ flex: 1, backgroundColor: CameraColors.bg }} />;
  }
  if (access === 'denied') {
    return (
      <CameraAccessDenied
        title="Why we need a photo"
        text="A photo of your new seat shows the café where to bring your order. Turn on camera access, or scan the code at your seat instead."
        backLabel="Back"
      />
    );
  }
  return <OneShotCamera />;
}

function OneShotCamera() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrders().data?.find((candidate) => candidate.id === id);
  const save = useUpdateSpot(id);
  const isFocused = useIsFocused();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  // Set at the first tap: taking the picture takes a moment, and a second tap in it must not
  // upload a second photo.
  const busy = useRef(false);

  async function takePicture() {
    if (!camera.current || busy.current) return;
    busy.current = true;
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.7 });
      save.mutate({ kind: 'photo', spot: picture.uri });
    } catch {
      // The camera failed: the shutter stays, so they can tap again.
      busy.current = false;
    }
  }

  function retry() {
    busy.current = false;
    save.reset();
  }

  return (
    <View style={{ flex: 1, backgroundColor: CameraColors.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />
      <CameraHeader onClose={() => router.back()} closeLabel="Close camera" />

      <Viewfinder>
        <CameraView
          ref={camera}
          style={{ flex: 1 }}
          facing="back"
          active={isFocused && !save.isError}
          onCameraReady={() => setReady(true)}
        />
        <ViewfinderHint text={save.isPending ? 'Saving your new spot…' : 'Your new spot'} />
      </Viewfinder>

      <CameraNote
        text={`Only ${order?.cafeName ?? 'the café'} sees it, for this order. Your selfie stays.`}
      />

      <View
        style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 8, gap: 12 }}
      >
        {save.isError && order ? (
          <MovedError error={save.error} order={order} onRetry={retry} />
        ) : save.isPending ? (
          <ActivityIndicator color={CameraColors.ink} size="large" />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <ShutterButton
              onPress={takePicture}
              disabled={!ready}
              accessibilityLabel="Take photo of your new spot"
            />
          </View>
        )}
      </View>
    </View>
  );
}
