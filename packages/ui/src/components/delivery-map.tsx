import { type Coordinates, fitCamera } from '@shoot/shared';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useState } from 'react';
import { Platform, type StyleProp, View, type ViewStyle } from 'react-native';

import { Radius } from '../constants/theme';
import { useTheme } from '../hooks/use-theme';

/** A fixed place: the café's stand or the customer's delivery spot. Drawn as a marker. */
export type MapPlace = {
  id: string;
  kind: 'cafe' | 'spot';
  coordinates: Coordinates;
  title: string;
};

/** Someone moving during the walk. Drawn as a small filled circle that follows them. */
export type MapDot = { id: string; kind: 'seller' | 'customer'; coordinates: Coordinates };

type Props = {
  places: MapPlace[];
  dots: MapDot[];
  /** The phone's own blue dot (the platform draws it; needs location permission). */
  showMyLocation: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
};

/** Metres. Small enough to read as a dot at street zoom, big enough to see. */
const DOT_RADIUS_M = 6;

/**
 * The delivery map: Apple Maps on iPhone, Google Maps on Android (expo-maps; needs a
 * development build, not Expo Go). Places are markers, people are dots.
 *
 * The camera is worked out once, when the map first shows, so it fits everything that's known
 * then. After that it stays where the person moved it: a map that jumps back every time the
 * seller takes a step can't be read.
 */
export function DeliveryMap({ places, dots, showMyLocation, style, accessibilityLabel }: Props) {
  const theme = useTheme();
  const [camera] = useState(() =>
    fitCamera([...places, ...dots].map((point) => point.coordinates)),
  );
  const dotColor = { seller: theme.accent, customer: theme.ink };

  const circles = dots.map((dot) => ({
    id: dot.id,
    center: dot.coordinates,
    radius: DOT_RADIUS_M,
    color: dotColor[dot.kind],
    lineColor: theme.surface,
    lineWidth: 2,
  }));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[{ borderRadius: Radius.card, overflow: 'hidden' }, style]}
    >
      {Platform.OS === 'ios' ? (
        <AppleMaps.View
          style={{ flex: 1 }}
          cameraPosition={camera}
          markers={places.map((place) => ({
            id: place.id,
            coordinates: place.coordinates,
            title: place.title,
            systemImage: place.kind === 'cafe' ? 'cup.and.saucer.fill' : 'mappin',
            tintColor: place.kind === 'cafe' ? theme.primary : theme.ink,
          }))}
          circles={circles}
          properties={{ isMyLocationEnabled: showMyLocation }}
          uiSettings={{ myLocationButtonEnabled: false }}
        />
      ) : (
        <GoogleMaps.View
          style={{ flex: 1 }}
          cameraPosition={camera}
          markers={places.map((place) => ({
            id: place.id,
            coordinates: place.coordinates,
            title: place.title,
          }))}
          circles={circles}
          properties={{ isMyLocationEnabled: showMyLocation }}
          uiSettings={{ myLocationButtonEnabled: false, mapToolbarEnabled: false }}
        />
      )}
    </View>
  );
}
