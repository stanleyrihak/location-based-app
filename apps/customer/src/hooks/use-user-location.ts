import type { Coordinates } from '@shoot/shared';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

/** Shared with useCheckRange, which asks for a fresh position through the same cache entry. */
export const USER_LOCATION_KEY = ['user-location'];

/**
 * Asks the phone where it is. Fails if the location permission isn't granted.
 * High accuracy (GPS): this position becomes the delivery spot, and E10 later measures how far
 * the customer moved from it. A rough Wi-Fi fix (up to ~100 m off) would make that guesswork.
 */
export async function getUserLocation(): Promise<Coordinates> {
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

/** The device's current position. Fails if the location permission isn't granted. */
export function useUserLocation() {
  return useQuery({
    queryKey: USER_LOCATION_KEY,
    queryFn: getUserLocation,
    staleTime: 30_000,
    retry: false,
  });
}
