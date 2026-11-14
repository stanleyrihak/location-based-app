import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { COUNTRIES, type CountryCode, CountryCodeSelect } from '@/components/country-code-select';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
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
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
        style={{ flex: 1 }}
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
              {'What’s your phone number?'}
            </ThemedText>
            <ThemedText type="body" color="ink2">
              {'We’ll text you a code to sign in. We never call you.'}
            </ThemedText>
          </View>

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

          <View style={{ marginTop: 'auto', paddingTop: 16 }}>
            <Button onPress={sendCode} disabled={!isValid}>
              {'Send code'}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
