import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { CodeField } from '@/components/code-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SmsCodeScreen() {
  const [code, setCode] = useState('');

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 24, gap: 10 }}>
      <ThemedText type="headline">{'Enter the code'}</ThemedText>

      <CodeField value={code} onChange={setCode} />

      <Button onPress={() => router.push('/location-permission')}>{'Next'}</Button>
    </ThemedView>
  );
}
