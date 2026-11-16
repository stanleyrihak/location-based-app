import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { COUNTRIES, type CountryCode, CountryCodeSelect } from '@/components/country-code-select';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

const MIN_DIGITS = 7;

function formatPhone(digits: string, groups: readonly number[]) {
  const parts: string[] = [];
  let start = 0;

  for (const size of groups) {
    const part = digits.slice(start, start + size);
    if (part) parts.push(part);
    start += size;
  }

  return parts.join(' ');
}

export default function PhoneNumberScreen() {
  const [countryCode, setCountryCode] = useState<CountryCode>('FI');
  const [digits, setDigits] = useState('');

  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0];
  const maxDigits = country.groups.reduce((sum, size) => sum + size, 0);
  const isValid = digits.length >= MIN_DIGITS;

  function handleChangeText(text: string) {
    setDigits(text.replace(/\D/g, '').slice(0, maxDigits));
  }

  function sendCode() {
    if (!isValid) {
      return;
    }

    router.push({
      pathname: '/sms-code',
      params: { phone: `${country.dial} ${formatPhone(digits, country.groups)}` },
    });
  }

  return (
    <FormScreen
      title="What’s your phone number?"
      lede="We’ll text you a code to sign in. We never call you."
      footer={
        <Button onPress={sendCode} disabled={!isValid}>
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
      </View>
    </FormScreen>
  );
}
