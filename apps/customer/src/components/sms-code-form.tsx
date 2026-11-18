import { Button, FormScreen, ThemedText } from '@shoot/ui';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { CodeField } from '@/components/code-field';
import { changePhone, sendSmsCode, verifySmsCode } from '@/data/api';
import { ME_KEY } from '@/data/queries';
import { setToken } from '@/data/session';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 42;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

/** 1.3, for signing in, or (mode 'change', from Profile) to prove a new number. */
export function SmsCodeForm({ mode }: { mode: 'sign-in' | 'change' }) {
  const queryClient = useQueryClient();
  // `phone` is for the server ("+358401234567"), `display` for people ("+358 40 123 4567").
  const { phone, display } = useLocalSearchParams<{ phone?: string; display?: string }>();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function resendCode() {
    if (!phone) return;
    setCode('');
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    try {
      await sendSmsCode(phone);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We couldn’t send a new code.');
    }
  }

  async function verify() {
    // The ref, not state: CodeField calls verify by itself when the last digit is typed,
    // and a fast tap on Verify could call it a second time before a re-render.
    if (isVerifying.current || !phone) {
      return;
    }
    isVerifying.current = true;
    setVerifying(true);
    setError(null);

    try {
      if (mode === 'change') {
        const user = await changePhone(phone, code);
        queryClient.setQueryData(ME_KEY, user);
        router.dismissTo('/profile');
        return;
      }
      const { token } = await verifySmsCode(phone, code);
      // Saved before moving on: from now on every request says who you are.
      setToken(token);
      router.push('/location-permission');
    } catch (caught) {
      // Wrong or expired code: clear the boxes so the user can type it again.
      setError(caught instanceof Error ? caught.message : 'We couldn’t check the code.');
      setCode('');
      isVerifying.current = false;
    } finally {
      setVerifying(false);
    }
  }

  const canResend = secondsLeft <= 0;

  return (
    <FormScreen
      title="Enter the code"
      lede={display ? `Sent to ${display}` : undefined}
      footer={
        <Button onPress={verify} disabled={code.length < CODE_LENGTH} loading={verifying}>
          {'Verify'}
        </Button>
      }
    >
      <View style={{ marginTop: 32 }}>
        <CodeField value={code} onChange={setCode} onComplete={verify} length={CODE_LENGTH} />
        {error && (
          <ThemedText
            type="subhead"
            color="error"
            accessibilityRole="alert"
            style={{ marginTop: 12 }}
          >
            {error}
          </ThemedText>
        )}
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
