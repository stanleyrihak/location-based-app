import { router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CodeField } from '@/components/code-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 42;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function SmsCodeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // Counts down one second at a time. Each tick changes secondsLeft, which
  // runs this effect again and schedules the next tick until it reaches 0.
  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function resendCode() {
    // TODO: ask the backend to send a new code.
    setCode('');
    setSecondsLeft(RESEND_SECONDS);
  }

  function verify() {
    // TODO: check the code with the backend before moving on.
    router.push('/location-permission');
  }

  const canResend = secondsLeft <= 0;

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View style={{ gap: 8 }}>
            <ThemedText type="headline" accessibilityRole="header">
              {'Enter the code'}
            </ThemedText>
            {phone && (
              <ThemedText type="body" color="ink2" style={{ fontVariant: ['tabular-nums'] }}>
                {`Sent to ${phone}`}
              </ThemedText>
            )}
          </View>

          <View style={{ marginTop: 32 }}>
            <CodeField value={code} onChange={setCode} onComplete={verify} length={CODE_LENGTH} />
          </View>

          <Button
            variant="text"
            size="small"
            disabled={!canResend}
            onPress={resendCode}
            style={{ alignSelf: 'flex-start', marginTop: 16, paddingHorizontal: 0 }}
          >
            {canResend ? 'Resend code' : `Resend code in ${formatCountdown(secondsLeft)}`}
          </Button>

          <View style={{ marginTop: 'auto', paddingTop: 16 }}>
            <Button onPress={verify} disabled={code.length < CODE_LENGTH}>
              {'Verify'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
