import type { Position, Track } from '@shoot/shared';

/**
 * The latest positions of the orders on their way, in memory only: positions are never
 * written to the database, and a restart forgets them (the phones send new ones within seconds).
 */
export interface Tracker {
  set(orderId: string, who: 'seller' | 'customer', position: Position): void;
  /** Both nulls for an order nobody has sent a position for. */
  get(orderId: string): Track;
  /** When the walk ends: nobody's position is kept after "Delivered". */
  forget(orderId: string): void;
}

export function createTracker(): Tracker {
  const tracks = new Map<string, Track>();
  return {
    set(orderId, who, position) {
      const track = tracks.get(orderId) ?? { seller: null, customer: null };
      tracks.set(orderId, { ...track, [who]: position });
    },
    get(orderId) {
      return tracks.get(orderId) ?? { seller: null, customer: null };
    },
    forget(orderId) {
      tracks.delete(orderId);
    },
  };
}
