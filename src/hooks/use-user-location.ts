import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

import type { Coordinates } from '@/data/types';

/** The device's current position. Fails if the location permission isn't granted. */
export function useUserLocation() {
  return useQuery({
    queryKey: ['user-location'],
    queryFn: async (): Promise<Coordinates> => {
      const position = await Location.getCurrentPositionAsync();
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    },
    staleTime: 30_000,
    retry: false,
  });
}
