import type { Coordinates } from '@shoot/shared';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

/** Shared with useCheckRange, which asks for a fresh position through the same cache entry. */
export const USER_LOCATION_KEY = ['user-location'];

/** Asks the phone where it is. Fails if the location permission isn't granted. */
export async function getUserLocation(): Promise<Coordinates> {
  const position = await Location.getCurrentPositionAsync();
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
