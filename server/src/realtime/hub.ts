import type { OrderRow } from '../views.ts';

/** Sends order changes to the apps that are connected right now (WebSocket). */
export interface Hub {
  orderChanged(order: OrderRow): void;
}

/** The connected apps. Filled in by Task 7 of the server plan. */
export function createHub() {
  const hub: Hub = {
    orderChanged() {},
  };
  return hub;
}
