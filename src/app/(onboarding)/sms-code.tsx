import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { CodeField } from '@/components/code-field';
import { FormScreen } from '@/components/form-screen';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 42;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

export default function SmsCodeScreen() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const isVerifying = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useFocusEffect(
    useCallback(() => {
      isVerifying.current = false;
    }, []),
  );

  function resendCode() {
    // TODO: ask the backend to send a new code.
    setCode('');
    setSecondsLeft(RESEND_SECONDS);
  }

  function verify() {
    if (isVerifying.current) {
      return;
    }
    isVerifying.current = true;

    // TODO: check the code with the backend before moving on.
    router.push('/location-permission');
  }

  const canResend = secondsLeft <= 0;

  return (
    <FormScreen
      title="Enter the code"
      lede={phone ? `Sent to ${phone}` : undefined}
      footer={
        <Button onPress={verify} disabled={code.length < CODE_LENGTH}>
          {'Verify'}
        </Button>
      }
    >
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
    </FormScreen>
  );
}
