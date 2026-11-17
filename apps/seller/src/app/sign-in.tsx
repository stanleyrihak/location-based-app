import { Button, FormScreen, TextField, ThemedText, Wordmark } from '@shoot/ui';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/providers/session-provider';

/** Sellers sign in with the account the café was given. There's no sign-up in this app. */
export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length > 0;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // No navigation here: signing in flips the session, and the layout shows the tabs.
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We couldn’t sign you in.');
      setBusy(false);
    }
  }

  return (
    <FormScreen
      title="Sign in to your café"
      lede="Use the email and password your café was given."
      footer={
        <Button onPress={submit} disabled={!canSubmit} loading={busy}>
          {'Sign in'}
        </Button>
      }
    >
      <View style={{ marginTop: 24, gap: 16 }}>
        <View style={{ alignSelf: 'flex-start' }}>
          <Wordmark width={120} />
        </View>
        <View style={{ gap: 8 }}>
          <ThemedText type="subhead" weight="semibold">
            {'Email'}
          </ThemedText>
          <TextField
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            placeholder="cafe@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="username"
            accessibilityLabel="Email"
            autoFocus
          />
        </View>
        <View style={{ gap: 8 }}>
          <ThemedText type="subhead" weight="semibold">
            {'Password'}
          </ThemedText>
          <TextField
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            onSubmitEditing={submit}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            accessibilityLabel="Password"
          />
        </View>
        {error && (
          <ThemedText type="subhead" color="error" accessibilityRole="alert">
            {error}
          </ThemedText>
        )}
        {__DEV__ && (
          <ThemedText type="subhead" color="ink2">
            {'Test server: saaripaahtimo@shoot.test / shoot-demo (dev only).'}
          </ThemedText>
        )}
      </View>
    </FormScreen>
  );
}
