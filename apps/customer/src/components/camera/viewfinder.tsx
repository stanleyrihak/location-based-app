import { ThemedText, CameraColors, Radius } from '@shoot/ui';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

/** The rounded frame that holds the camera or a photo on the camera screens (`.viewfinder`). */
export function Viewfinder({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        flex: 1,
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: Radius.frame,
        overflow: 'hidden',
        backgroundColor: CameraColors.raised,
      }}
    >
      {children}
    </View>
  );
}

/** The dark pill at the bottom of the viewfinder: "First, a selfie" (`.hint`). */
export function ViewfinderHint({ text }: { text: string }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 20, alignItems: 'center' }}
    >
      <View
        // Read out when it changes, so VoiceOver users hear "Now your spot" after the selfie.
        accessibilityLiveRegion="polite"
        style={{
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderRadius: Radius.pill,
          backgroundColor: CameraColors.hintBg,
        }}
      >
        <ThemedText type="subhead" style={{ color: CameraColors.ink, textAlign: 'center' }}>
          {text}
        </ThemedText>
      </View>
    </View>
  );
}

/** The grey line of text under the viewfinder (`.cam-note`). */
export function CameraNote({ lead, text }: { lead?: string; text: string }) {
  return (
    <ThemedText
      type="subhead"
      style={{ marginTop: 16, marginHorizontal: 24, textAlign: 'center', color: CameraColors.ink2 }}
    >
      {lead && (
        <ThemedText type="subhead" weight="semibold" style={{ color: CameraColors.ink }}>
          {`${lead} `}
        </ThemedText>
      )}
      {text}
    </ThemedText>
  );
}
