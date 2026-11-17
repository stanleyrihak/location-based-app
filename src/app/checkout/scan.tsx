import { type BarcodeScanningResult, CameraView } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CameraHeader } from '@/components/camera/camera-header';
import { CameraNote, Viewfinder, ViewfinderHint } from '@/components/camera/viewfinder';
import { CameraAccessDenied } from '@/components/camera-access-denied';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { CameraColors, Radius } from '@/constants/theme';
import { getSpotByCode } from '@/data/api';
import { MOCK_SPOTS } from '@/data/mock/spots';
import { useNearbyCafe } from '@/data/queries';
import { useCameraAccess } from '@/hooks/use-camera-access';
import { useTheme } from '@/hooks/use-theme';
import { useCart } from '@/providers/cart-provider';
import { useCheckout } from '@/providers/checkout-provider';

/** scanning → checking (asking the "server") → done, or invalid (the E5 sheet). */
type ScanState = 'scanning' | 'checking' | 'invalid';

/** 2.6 Scan the QR code at your spot. A valid code replaces the photos. */
export default function ScanScreen() {
  const access = useCameraAccess();

  if (access === 'loading') {
    return <View style={{ flex: 1, backgroundColor: CameraColors.bg }} />;
  }
  if (access === 'denied') {
    return (
      <CameraAccessDenied
        title="Scanning needs the camera"
        text="The code at your spot tells the café exactly which table or bench you’re at. Turn on camera access to scan it, or go back and take a photo instead."
        backLabel="Back to confirm your spot"
      />
    );
  }
  return <Scanner />;
}

function Scanner() {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { cafe } = useNearbyCafe(cart.cafeId ?? '');
  const { setSpot } = useCheckout();
  // Only one camera can run at a time, so it pauses while another screen is on top.
  const isFocused = useIsFocused();

  const [state, setState] = useState<ScanState>('scanning');
  /**
   * The camera reports the same code many times a second. State updates aren't instant,
   * so a ref (which changes at once, without a re-render) makes sure we only handle one.
   */
  const busy = useRef(false);

  /**
   * E4: the camera says nothing about a code it can't read, it just keeps looking. So the
   * only sign is time: after 10 s with no code, the hint changes to help.
   */
  const [struggling, setStruggling] = useState(false);
  useEffect(() => {
    if (state !== 'scanning' || !isFocused) return;
    const timer = setTimeout(() => setStruggling(true), 10_000);
    // Cleanup: a code found (or the screen left) before 10 s cancels the timer.
    return () => clearTimeout(timer);
  }, [state, isFocused]);

  async function handleCode(code: string) {
    if (busy.current || !cart.cafeId) return;
    busy.current = true;
    setState('checking');

    const spot = await getSpotByCode(cart.cafeId, code);
    if (spot) {
      setSpot(spot);
      // Replace, not push: "back" from payment should go to the spot screen, not reopen the camera.
      router.replace('/checkout/payment');
    } else {
      setState('invalid');
    }
  }

  function scanAgain() {
    busy.current = false;
    setStruggling(false);
    setState('scanning');
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
          // Undefined turns scanning off while we check a code or show the sheet.
          onBarcodeScanned={
            state === 'scanning'
              ? (result: BarcodeScanningResult) => handleCode(result.data)
              : undefined
          }
        />
        <QrFrame checking={state === 'checking'} />
        <ViewfinderHint
          text={
            state === 'checking'
              ? 'Checking the code…'
              : struggling
                ? 'Can’t read it? Move closer and hold steady'
                : 'Point the camera at the code at your spot'
          }
        />
      </Viewfinder>

      <CameraNote text="The code tells the café exactly which table or bench you’re at." />

      <View
        style={{ gap: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: insets.bottom + 8 }}
      >
        <Button variant="secondary" camera onPress={() => router.replace('/checkout/photo')}>
          {'No code here? Take a photo instead'}
        </Button>
        {/*
          The simulator has no camera, so in development builds this button pretends a
          code of this café was scanned. __DEV__ is false in release builds, so users never see it.
        */}
        {__DEV__ && (
          <Button
            variant="text"
            size="small"
            camera
            onPress={() => {
              const code = MOCK_SPOTS.find((spot) => spot.cafeId === cart.cafeId)?.code;
              handleCode(code ?? 'not-a-spot');
            }}
          >
            {'Simulate a scan (dev only)'}
          </Button>
        )}
      </View>

      {state === 'invalid' && (
        <InvalidCodeSheet
          cafeName={cafe?.name ?? 'this café'}
          onScanAgain={scanAgain}
          onTakePhoto={() => router.replace('/checkout/photo')}
        />
      )}
    </View>
  );
}

/** The square to aim at, with the rest of the camera dimmed (`.qr-frame`). */
function QrFrame({ checking }: { checking: boolean }) {
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

/**
 * E5 "This code doesn't work here", as a sheet over the camera. It's drawn in this screen
 * rather than as its own route, because its buttons only change this screen's state.
 */
function InvalidCodeSheet({
  cafeName,
  onScanAgain,
  onTakePhoto,
}: {
  cafeName: string;
  onScanAgain: () => void;
  onTakePhoto: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'flex-end',
        backgroundColor: theme.scrim,
      }}
    >
      <View
        accessibilityViewIsModal
        style={{
          gap: 14,
          paddingTop: 24,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 8,
          borderTopLeftRadius: Radius.sheet,
          borderTopRightRadius: Radius.sheet,
          backgroundColor: theme.surface,
          boxShadow: '0 -8px 32px rgba(74, 44, 30, 0.18)',
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: theme.error,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="qr-x" size="xl" color="error" />
        </View>
        <ThemedText type="title" weight="bold" accessibilityRole="header">
          {'This code doesn’t work here'}
        </ThemedText>
        <ThemedText color="ink2">
          {`It isn’t a spot code for ${cafeName}. It may belong to another café, be out of the delivery range, or no longer be active.`}
        </ThemedText>
        <View style={{ gap: 12, marginTop: 4 }}>
          <Button onPress={onScanAgain}>{'Scan a different code'}</Button>
          <Button variant="secondary" onPress={onTakePhoto}>
            {'Take a photo instead'}
          </Button>
        </View>
      </View>
    </View>
  );
}
