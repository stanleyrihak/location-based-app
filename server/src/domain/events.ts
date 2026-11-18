/**
 * What just happened to an order. Every status change sends exactly one event, which the
 * live connections (realtime/hub.ts) react to.
 */
export type OrderEvent =
  | 'created'
  | 'received'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'on-the-way'
  | 'delivered'
  | 'abandoned';
