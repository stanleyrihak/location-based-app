import type { Coordinates } from '@shoot/shared';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

// Shared with the server (@shoot/shared), so both measure the same way.
export { distanceInMetres } from '@shoot/shared';

/** How far `to` is north and east of `from`, in metres. For drawing a map. */
export function offsetInMetres(from: Coordinates, to: Coordinates) {
  const metresPerDegree = (Math.PI * EARTH_RADIUS_M) / 180;

  return {
    northM: (to.latitude - from.latitude) * metresPerDegree,
    eastM: (to.longitude - from.longitude) * metresPerDegree * Math.cos(toRadians(from.latitude)),
  };
}
