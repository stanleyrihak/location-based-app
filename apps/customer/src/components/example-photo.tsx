import { ThemedText, Radius, useTheme } from '@shoot/ui';
import { Image } from 'expo-image';
import { View } from 'react-native';

/**
 * The example from the design (`.example`): a photo of the spot, with the selfie as a
 * small picture-in-picture in the corner. It shows what "a good photo" looks like.
 */
export function ExamplePhoto() {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Example of a good photo: the spot where you sit, with your selfie in the corner"
      style={{
        aspectRatio: 3 / 2,
        borderRadius: Radius.card,
        overflow: 'hidden',
        backgroundColor: theme.surface2,
      }}
    >
      <Image
        source={require('@/assets/images/spot/spot-wide.jpg')}
        contentFit="cover"
        style={{ flex: 1 }}
      />
      <View
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          width: 78,
          aspectRatio: 11 / 15,
          borderRadius: Radius.input,
          overflow: 'hidden',
          backgroundColor: theme.bg,
          // The white ring round the inset (`box-shadow: 0 0 0 3px white`).
          boxShadow: `0 0 0 3px ${theme.surface}`,
        }}
      >
        <Image
          source={require('@/assets/images/selfie-example.svg')}
          contentFit="cover"
          contentPosition="top"
          style={{ flex: 1 }}
        />
      </View>
      <PhotoTag label="A good photo" />
    </View>
  );
}

/** White pill on a photo (`.photo-tag`). */
export function PhotoTag({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: Radius.pill,
        backgroundColor: theme.surface,
      }}
    >
      <ThemedText type="caption" weight="semibold">
        {label}
      </ThemedText>
    </View>
  );
}
