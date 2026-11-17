// The same maths as src/utils/geo.ts in the app. The server repeats the range check because
// the phone can be wrong, or lie.

export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000;
const METRES_PER_DEGREE = (Math.PI * EARTH_RADIUS_M) / 180;

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

/** The point `northM` metres north and `eastM` metres east of `from`. */
export function moveBy(from: Coordinates, northM: number, eastM: number): Coordinates {
  return {
    latitude: from.latitude + northM / METRES_PER_DEGREE,
    longitude: from.longitude + eastM / (METRES_PER_DEGREE * Math.cos(toRadians(from.latitude))),
  };
}
