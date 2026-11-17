import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** The bold start: "Your photo is your proof of location." */
  lead: string;
  /** The rest, in regular weight. */
  text: string;
};

/** Sand box with a shield, saying who sees the user's data (`.privacy`). */
export function PrivacyNote({ lead, text }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: Radius.input,
        backgroundColor: theme.infoBg,
      }}
    >
      <Icon name="shield" />
      <ThemedText type="subhead" style={{ flex: 1 }}>
        <ThemedText type="subhead" weight="semibold">
          {lead}
        </ThemedText>
        {` ${text}`}
      </ThemedText>
    </View>
  );
}
