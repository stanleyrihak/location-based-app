import type { Coordinates } from './types.ts';

/** Close enough to see the street and the table; the map never starts further in than this. */
const STREET_ZOOM = 17;
/** The whole delivery area of a café; the map never starts further out than this. */
const AREA_ZOOM = 14;

/**
 * Where a map should start so every point is on screen: the middle of the points, and a zoom
 * that fits them. Zoom z shows about 360 / 2^z degrees across; one level less leaves a margin.
 * A degree of longitude is shorter away from the equator, so it's scaled by cos(latitude).
 */
export function fitCamera(points: Coordinates[]): { coordinates: Coordinates; zoom: number } {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const [south, north] = [Math.min(...latitudes), Math.max(...latitudes)];
  const [west, east] = [Math.min(...longitudes), Math.max(...longitudes)];
  const coordinates = { latitude: (south + north) / 2, longitude: (west + east) / 2 };

  const span = Math.max(
    north - south,
    (east - west) * Math.cos((coordinates.latitude * Math.PI) / 180),
  );
  if (span === 0) return { coordinates, zoom: STREET_ZOOM };
  const zoom = Math.floor(Math.log2(360 / span)) - 1;
  return { coordinates, zoom: Math.min(STREET_ZOOM, Math.max(AREA_ZOOM, zoom)) };
}
