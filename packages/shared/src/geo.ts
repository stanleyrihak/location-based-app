import { isLiveStatus } from './orders.ts';
import type { Coordinates, Order } from './types.ts';

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

/** E10: further than this from the delivery spot, the app asks "Moved to a different seat?". */
export const MOVED_THRESHOLD_M = 30;

/**
 * Whether to ask the customer if they moved: a live order they haven't said "No, I'm still
 * here" to, and a position more than 30 m from its delivery spot. A position is a guess with a
 * radius (`accuracy`, in metres); if that radius alone could explain the distance, don't ask.
 */
export function movedFromSpot(
  order: Pick<Order, 'id' | 'status' | 'deliverTo'>,
  here: Coordinates & { accuracy?: number | null },
  dismissed: ReadonlySet<string>,
): boolean {
  if (!isLiveStatus(order.status) || dismissed.has(order.id)) return false;
  const distance = distanceInMetres(order.deliverTo, here);
  if (distance <= MOVED_THRESHOLD_M) return false;
  return here.accuracy == null || here.accuracy <= distance - MOVED_THRESHOLD_M;
}
