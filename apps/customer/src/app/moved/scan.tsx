import { Button, CameraColors } from '@shoot/ui';
import { type BarcodeScanningResult, CameraView } from 'expo-camera';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraHeader } from '@/components/camera/camera-header';
import { QrFrame } from '@/components/camera/qr-frame';
import { CameraNote, Viewfinder, ViewfinderHint } from '@/components/camera/viewfinder';
import { CameraAccessDenied } from '@/components/camera-access-denied';
import { MovedError } from '@/components/moved-error';
import { useOrders } from '@/data/queries';
import { useCameraAccess } from '@/hooks/use-camera-access';
import { useUpdateSpot } from '@/hooks/use-update-spot';

/** For "Simulate a scan (dev only)": another sticker of the first test café (server seed). */
const DEV_SPOT_CODE = 'shoot-spot:saari-bench-fountain';

/** E10, scan the code at the new seat. The server checks it belongs to this café. */
export default function MovedScanScreen() {
  const access = useCameraAccess();
  if (access === 'loading') {
    return <View style={{ flex: 1, backgroundColor: CameraColors.bg }} />;
  }
  if (access === 'denied') {
    return (
      <CameraAccessDenied
        title="Scanning needs the camera"
        text="The code at your seat tells the café exactly where you are now. Turn on camera access to scan it."
        backLabel="Back"
      />
    );
  }
  return <Scanner />;
}

function Scanner() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useOrders().data?.find((candidate) => candidate.id === id);
  const save = useUpdateSpot(id);
  const isFocused = useIsFocused();
  const scanning = save.isIdle;
  // The camera reports the same code many times a second, faster than the mutation's state
  // changes: a ref (set at once) makes sure one scan sends one request.
  const busy = useRef(false);

  function handleCode(code: string) {
    if (busy.current) return;
    busy.current = true;
    save.mutate({ kind: 'spot', spotCode: code });
  }

  function retry() {
    busy.current = false;
    save.reset();
  }

  return (
    <View style={{ flex: 1, backgroundColor: CameraColors.bg, paddingTop: insets.top }}>
      <StatusBar style="light" />
      <CameraHeader onClose={() => router.back()} closeLabel="Close scanner" />

      <Viewfinder>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          active={isFocused}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          // Undefined turns scanning off while the code is checked or an error shows.
          onBarcodeScanned={
            scanning ? (result: BarcodeScanningResult) => handleCode(result.data) : undefined
          }
        />
        <QrFrame checking={save.isPending} />
        <ViewfinderHint
          text={save.isPending ? 'Checking the code…' : 'Point the camera at the code at your seat'}
        />
      </Viewfinder>

      <CameraNote text="The code tells the café exactly which table or bench you’re at now." />

      <View
        style={{ gap: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 8 }}
      >
        {save.isError && order && <MovedError error={save.error} order={order} onRetry={retry} />}
        {__DEV__ && scanning && (
          <Button variant="text" size="small" camera onPress={() => handleCode(DEV_SPOT_CODE)}>
            {'Simulate a scan (dev only)'}
          </Button>
        )}
      </View>
    </View>
  );
}
