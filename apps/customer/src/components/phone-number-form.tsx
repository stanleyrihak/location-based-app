import { Button, FormScreen, TextField, ThemedText } from '@shoot/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  COUNTRIES,
  type CountryCode,
  CountryCodeSelect,
  formatPhone,
} from '@/components/country-code-select';
import { sendSmsCode } from '@/data/api';

const MIN_DIGITS = 7;

/**
 * 1.2, for signing in, or (mode 'change', from Profile) for a new number. The code screen
 * after it then changes the number instead of signing in.
 */
export function PhoneNumberForm({ mode }: { mode: 'sign-in' | 'change' }) {
  const [countryCode, setCountryCode] = useState<CountryCode>('FI');
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];
  const maxDigits = country.groups.reduce((sum, size) => sum + size, 0);
  const isValid = digits.length >= MIN_DIGITS;

  function handleChangeText(text: string) {
    setDigits(text.replace(/\D/g, '').slice(0, maxDigits));
    setError(null);
  }

  async function sendCode() {
    if (!isValid || sending) {
      return;
    }
    // The server wants one form: country code and digits, no spaces ("+358401234567").
    const phone = `${country.dial}${digits}`;

    setSending(true);
    setError(null);
    try {
      await sendSmsCode(phone);
      router.push({
        pathname: mode === 'change' ? '/change-code' : '/sms-code',
        // `display` for the screen ("Sent to +358 40 123 4567"), `phone` for the server.
        params: { phone, display: `${country.dial} ${formatPhone(digits, country.groups)}` },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We couldn’t send the code.');
    } finally {
      setSending(false);
    }
  }

  return (
    <FormScreen
      title={mode === 'change' ? 'Your new number' : 'What’s your phone number?'}
      lede={
        mode === 'change'
          ? 'We’ll text a code to the new number, to check it’s yours.'
          : 'We’ll text you a code to sign in. We never call you.'
      }
      footer={
        <Button onPress={sendCode} disabled={!isValid} loading={sending}>
          {'Send code'}
        </Button>
      }
    >
      <View style={{ marginTop: 32, gap: 8 }}>
        <ThemedText type="subhead" weight="semibold">
          {'Phone number'}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
          <TextField
            value={formatPhone(digits, country.groups)}
            onChangeText={handleChangeText}
            onSubmitEditing={sendCode}
            maxLength={maxDigits + country.groups.length - 1}
            placeholder={country.placeholder}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            accessibilityLabel="Phone number"
            autoFocus
            style={{ flex: 1, fontVariant: ['tabular-nums'] }}
          />
        </View>
        {error && (
          <ThemedText type="subhead" color="error" accessibilityRole="alert">
            {error}
          </ThemedText>
        )}
      </View>
    </FormScreen>
  );
}
