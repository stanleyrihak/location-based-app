import { useQueryClient } from '@tanstack/react-query';

import type { Cafe, Coordinates } from '@/data/types';
import { getUserLocation, USER_LOCATION_KEY } from '@/hooks/use-user-location';
import { distanceInMetres } from '@/utils/geo';

/** Thrown when paying is stopped because the user walked out of the café's range (E1). */
export class OutOfRangeError extends Error {
  constructor() {
    super('You’re out of the café’s delivery range.');
    this.name = 'OutOfRangeError';
  }
}

/**
 * Checks, right now, whether the café still delivers to you.
 *
 * The position on screen can be up to 30 s old (staleTime in useUserLocation), and people
 * walk while they order. So this asks the phone again (staleTime: 0) and writes the answer
 * into the same cache entry: every screen showing a distance updates with it.
 *
 * In a real app the server checks this too when the order arrives, because the phone can be
 * wrong or lie. The check here is for a clear message before anyone is charged.
 */
export function useCheckRange() {
  const queryClient = useQueryClient();

  return async (cafe: Cafe): Promise<{ inRange: boolean; here: Coordinates }> => {
    const here = await queryClient.query({
      queryKey: USER_LOCATION_KEY,
      queryFn: getUserLocation,
      staleTime: 0,
    });
    return { inRange: distanceInMetres(here, cafe.coordinates) <= cafe.radiusM, here };
  };
}
