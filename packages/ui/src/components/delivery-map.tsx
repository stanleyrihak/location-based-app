import { type Coordinates, fitCamera } from '@shoot/shared';
import * as Location from 'expo-location';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { useEffect, useState } from 'react';
import { AppState, Platform, type StyleProp, View, type ViewStyle } from 'react-native';

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
  /** The phone's own blue dot (the platform draws it). Shown only once location is allowed. */
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
 * The camera fits everything on the map when it first shows, and again when someone appears
 * or leaves (the seller's dot at "On my way"). In between it stays where the person moved it:
 * a map that jumps back every time the seller takes a step can't be read.
 */
export function DeliveryMap({ places, dots, showMyLocation, style, accessibilityLabel }: Props) {
  const theme = useTheme();
  const points = [...places, ...dots];
  // Who's on the map. When it changes, the camera is fitted again (and the native map starts
  // over with it, through `key`: its camera prop only sets where it starts).
  const layout = points.map((point) => point.id).join(',');
  const [fit, setFit] = useState(() => ({
    layout,
    camera: fitCamera(points.map((p) => p.coordinates)),
  }));
  if (fit.layout !== layout) {
    setFit({ layout, camera: fitCamera(points.map((point) => point.coordinates)) });
  }
  const { camera } = fit;
  // Android's Google Maps crashes when asked for the blue dot without location permission,
  // so the dot waits for it (the seller app asks at "On my way").
  // Read again whenever the app comes back to the front: the system's permission dialog (or
  // Settings) sends it to the background for a moment.
  const [permission, , readPermission] = Location.useForegroundPermissions();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void readPermission();
    });
    return () => subscription.remove();
  }, [readPermission]);
  const myLocation = showMyLocation && permission?.granted === true;
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
          key={layout}
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
          properties={{ isMyLocationEnabled: myLocation }}
          uiSettings={{ myLocationButtonEnabled: false }}
        />
      ) : (
        <GoogleMaps.View
          key={layout}
          style={{ flex: 1 }}
          cameraPosition={camera}
          markers={places.map((place) => ({
            id: place.id,
            coordinates: place.coordinates,
            title: place.title,
          }))}
          circles={circles}
          properties={{ isMyLocationEnabled: myLocation }}
          uiSettings={{ myLocationButtonEnabled: false, mapToolbarEnabled: false }}
        />
      )}
    </View>
  );
}
