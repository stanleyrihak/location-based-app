import { skipToken, useQuery } from '@tanstack/react-query';

import { getCafes } from '@/data/api';
import type { Cafe, Coordinates } from '@/data/types';
import { useUserLocation } from '@/hooks/use-user-location';
import { distanceInMetres } from '@/utils/geo';

export type NearbyCafe = Cafe & {
  distanceM: number;
  inRange: boolean;
};

function withDistance(cafes: Cafe[], from: Coordinates): NearbyCafe[] {
  return cafes
    .map((cafe) => {
      const distanceM = distanceInMetres(from, cafe.coordinates);
      return { ...cafe, distanceM, inRange: distanceM <= cafe.radiusM };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
}

/** Cafés around the user, closest first, each with its distance and whether it delivers to you. */
export function useNearbyCafes() {
  const location = useUserLocation();
  const near = location.data;

  const cafes = useQuery({
    queryKey: ['cafes', near],
    // skipToken: don't run until the location is known.
    queryFn: near ? () => getCafes(near) : skipToken,
  });

  // Native errors ("kCLErrorDomain error 0") mean nothing to users, so we say
  // which step failed instead of showing the raw text.
  let errorMessage: string | undefined;
  if (location.error) {
    errorMessage =
      'We couldn’t find your location. Check that Location Services are on, then try again.';
  } else if (cafes.error) {
    errorMessage = 'We couldn’t load cafés nearby. Check your connection, then try again.';
  }

  return {
    cafes: near && cafes.data ? withDistance(cafes.data, near) : undefined,
    errorMessage,
    retry: () => (location.error ? location.refetch() : cafes.refetch()),
  };
}
