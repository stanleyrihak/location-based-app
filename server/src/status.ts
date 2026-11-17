import { config } from './config.ts';
import { db } from './db.ts';

/** The order of the steps. A status can only move forward. */
export const ORDER_STATUSES = ['received', 'preparing', 'on-the-way', 'delivered'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export function stepOf(status: OrderStatus) {
  return ORDER_STATUSES.indexOf(status);
}

/**
 * Where an order would be if the café followed the clock: received for the first minute,
 * preparing until it's ready, 3 minutes on the way, then delivered.
 */
function statusByClock(createdAt: string, readyAt: string, now: number): OrderStatus {
  const created = Date.parse(createdAt);
  const ready = Date.parse(readyAt);
  if (now < created + 60_000) return 'received';
  if (now < ready) return 'preparing';
  if (now < ready + 3 * 60_000) return 'on-the-way';
  return 'delivered';
}

/**
 * AUTO_ADVANCE: until there is a café app, the server plays the café and moves orders along
 * by the clock. Orders a staff member has changed by hand (auto_status = 0) are left alone.
 */
export function startAutoAdvance() {
  if (!config.autoAdvance) return;

  const select = db.prepare(
    `SELECT id, status, created_at, ready_at FROM orders
     WHERE auto_status = 1 AND status != 'delivered'`,
  );
  const update = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?');

  setInterval(() => {
    const now = Date.now();
    const rows = select.all() as {
      id: string;
      status: OrderStatus;
      created_at: string;
      ready_at: string;
    }[];
    for (const row of rows) {
      const next = statusByClock(row.created_at, row.ready_at, now);
      if (stepOf(next) > stepOf(row.status)) {
        update.run(next, new Date(now).toISOString(), row.id);
      }
    }
  }, 5_000);
}
