import type { Coordinates, PositionMessage, Track } from '@shoot/shared';

import type { Deps } from '../deps.ts';
import { HttpError } from '../errors.ts';
import { getCafeOrder, getUserOrder } from './orders.ts';

const NOBODY: Track = { seller: null, customer: null };

/**
 * A position during the walk. The seller's goes to the customer, the customer's to the café.
 * Only while the order is on the way: a late one from the seller's background task (after
 * "Delivered") is refused, so nobody's position is shared when it isn't needed.
 */
export function recordPosition(
  deps: Deps,
  who: { cafeId: string } | { userId: string },
  orderId: string,
  coordinates: Coordinates,
) {
  const order =
    'cafeId' in who
      ? getCafeOrder(deps, who.cafeId, orderId)
      : getUserOrder(deps, who.userId, orderId);
  if (order.status !== 'on-the-way') {
    throw new HttpError(409, 'status_conflict', 'Positions are only shared on the way.', {
      status: order.status,
    });
  }
  const side = 'cafeId' in who ? 'seller' : 'customer';
  const position = { ...coordinates, at: new Date(deps.now()).toISOString() };
  deps.tracker.set(order.id, side, position);
  const message: PositionMessage = { type: `${side}.position`, orderId: order.id, position };
  deps.hub.positionChanged(order, message);
}

/** The latest positions, for a screen that opens (or reconnects) in the middle of the walk. */
export function getTrack(
  deps: Deps,
  who: { cafeId: string } | { userId: string },
  orderId: string,
): Track {
  const order =
    'cafeId' in who
      ? getCafeOrder(deps, who.cafeId, orderId)
      : getUserOrder(deps, who.userId, orderId);
  return order.status === 'on-the-way' ? deps.tracker.get(order.id) : NOBODY;
}
