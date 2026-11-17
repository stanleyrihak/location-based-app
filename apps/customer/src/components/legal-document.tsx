import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius } from '@/constants/theme';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type Props = {
  title: string;
  updated: string;
  summary?: string[];
  sections: LegalSection[];
};

/** Shared layout for the Terms and Privacy pages: title, short summary card, numbered sections. */
export function LegalDocument({ title, updated, summary, sections }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }}
    >
      <ThemedText type="headline" accessibilityRole="header">
        {title}
      </ThemedText>
      <ThemedText type="subhead" color="ink2" style={{ marginTop: 4 }}>
        {`Last updated ${updated}`}
      </ThemedText>

      {summary && (
        <ThemedView
          background="infoBg"
          style={{ marginTop: 24, padding: 16, gap: 8, borderRadius: Radius.card }}
        >
          <ThemedText weight="semibold">{'The short version'}</ThemedText>
          {summary.map((line) => (
            <Bullet key={line} text={line} />
          ))}
        </ThemedView>
      )}

      {sections.map((section, index) => (
        <View key={section.title} style={{ marginTop: 32, gap: 12 }}>
          <ThemedText type="title" accessibilityRole="header">
            {`${index + 1}. ${section.title}`}
          </ThemedText>
          {section.paragraphs?.map((paragraph) => (
            <ThemedText key={paragraph} color="ink2">
              {paragraph}
            </ThemedText>
          ))}
          {section.bullets && (
            <View style={{ gap: 8 }}>
              {section.bullets.map((bullet) => (
                <Bullet key={bullet} text={bullet} />
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <ThemedText color="ink2" aria-hidden>
        {'•'}
      </ThemedText>
      <ThemedText color="ink2" style={{ flex: 1 }}>
        {text}
      </ThemedText>
    </View>
  );
}
