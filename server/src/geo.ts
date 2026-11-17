// The server repeats the app's range check because the phone can be wrong, or lie.

export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000;
const METRES_PER_DEGREE = (Math.PI * EARTH_RADIUS_M) / 180;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

// The distance maths is shared with the apps (@shoot/shared).
export { distanceInMetres } from '@shoot/shared';

/** The point `northM` metres north and `eastM` metres east of `from`. */
export function moveBy(from: Coordinates, northM: number, eastM: number): Coordinates {
  return {
    latitude: from.latitude + northM / METRES_PER_DEGREE,
    longitude: from.longitude + eastM / (METRES_PER_DEGREE * Math.cos(toRadians(from.latitude))),
  };
}
