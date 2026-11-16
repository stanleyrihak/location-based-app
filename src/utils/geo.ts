import type { Coordinates } from '@/data/types';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Straight-line distance between two points, in metres (the haversine formula). */
export function distanceInMetres(a: Coordinates, b: Coordinates) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** How far `to` is north and east of `from`, in metres (the reverse of moveBy). For drawing a map. */
export function offsetInMetres(from: Coordinates, to: Coordinates) {
  const metresPerDegree = (Math.PI * EARTH_RADIUS_M) / 180;

  return {
    northM: (to.latitude - from.latitude) * metresPerDegree,
    eastM: (to.longitude - from.longitude) * metresPerDegree * Math.cos(toRadians(from.latitude)),
  };
}

/** The point `northM` metres north and `eastM` metres east of `from`. Accurate for short distances. */
export function moveBy(from: Coordinates, northM: number, eastM: number): Coordinates {
  const metresPerDegree = (Math.PI * EARTH_RADIUS_M) / 180; // about 111 km

  return {
    latitude: from.latitude + northM / metresPerDegree,
    longitude: from.longitude + eastM / (metresPerDegree * Math.cos(toRadians(from.latitude))),
  };
}
