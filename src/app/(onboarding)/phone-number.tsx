import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { type CountryCode, CountryCodeSelect } from '@/components/country-code-select';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PhoneNumberScreen() {
  const insets = useSafeAreaInsets();
  const [countryCode, setCountryCode] = useState<CountryCode>('FI');

  return (
    <ThemedView
      style={{
        flex: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ThemedText type="headline">{'What is your phone number?'}</ThemedText>
      <ThemedText type="body">{'We’ll text you a code to sign in. We never call you.'}</ThemedText>

      <View style={{ marginTop: 32, gap: 8 }}>
        <ThemedText type="subhead" weight="semibold">
          {'Phone number'}
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
          <TextField
            placeholder="40 123 4567"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            autoFocus
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <Button onPress={() => router.push('/sms-code')}>{'Send code'}</Button>
    </ThemedView>
  );
}
