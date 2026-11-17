import { useHeaderHeight } from 'expo-router/react-navigation';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { ThemedView } from '@/components/themed-view';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';

type Props = {
  title: string;
  lede?: string;
  children: ReactNode;
  footer: ReactNode;
};

export function FormScreen({ title, lede, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const keyboardVisible = useKeyboardVisible();

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* No paddingBottom here: with behavior="padding" the component sets its own. */}
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
            paddingBottom: keyboardVisible ? 16 : insets.bottom + 16,
          }}
        >
          <PageHeader title={title} lede={lede} />
          {children}
          <View style={{ marginTop: 'auto', paddingTop: 16, gap: 12 }}>{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
