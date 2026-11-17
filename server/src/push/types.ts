import type { OrderEvent } from '../domain/events.ts';
import type { OrderRow } from '../views.ts';

/**
 * Push notifications for order changes. Fire and forget: a failed push is logged, never
 * thrown, because the order change itself already happened and must not be undone by it.
 */
export interface Push {
  orderChanged(order: OrderRow, event: OrderEvent): void;
}
