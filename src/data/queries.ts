import { skipToken, useQuery } from '@tanstack/react-query';

import { getCafes, getMenu, getMenuItems } from '@/data/api';
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

/**
 * One café from the nearby list. It reuses useNearbyCafes, so when you come from Home
 * the list is already cached and the menu header shows at once, with no extra request.
 */
export function useNearbyCafe(id: string) {
  const { cafes, errorMessage, retry } = useNearbyCafes();
  return {
    cafe: cafes?.find((cafe) => cafe.id === id),
    isLoading: cafes === undefined,
    errorMessage,
    retry,
  };
}

/** A café's menu. The id is part of the key, so each café's menu is cached on its own. */
export function useMenu(cafeId: string) {
  return useQuery({ queryKey: ['menu', cafeId], queryFn: () => getMenu(cafeId) });
}

/** All products of the given cafés, for search. Waits until the cafés are known. */
export function useMenuItems(cafeIds: string[] | undefined) {
  return useQuery({
    queryKey: ['menu-items', cafeIds],
    queryFn: cafeIds ? () => getMenuItems(cafeIds) : skipToken,
  });
}
