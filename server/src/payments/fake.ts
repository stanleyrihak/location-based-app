import { randomUUID } from 'node:crypto';

import type { Payments } from './types.ts';

/**
 * Pretend payments, used when there's no Stripe key and in tests. Every payment is held at
 * once, except with Stripe's always-declining test card 0002. It remembers what it captured
 * and released, so tests can check that money moved exactly once.
 */
export function createFakePayments() {
  const methods = new Map<string, string>();
  const captures: string[] = [];
  const releases: string[] = [];
  let failCapture = false;

  const payments: Payments = {
    async reserve(_amountCents, methodId) {
      const paymentId = `fake_${randomUUID()}`;
      methods.set(paymentId, methodId);
      return { paymentId, clientSecret: null };
    },
    async isReserved(paymentId) {
      return methods.has(paymentId) && methods.get(paymentId) !== 'card-0002';
    },
    async capture(paymentId) {
      if (failCapture) {
        failCapture = false;
        throw new Error('The card reservation could not be captured.');
      }
      captures.push(paymentId);
    },
    async release(paymentId) {
      releases.push(paymentId);
    },
  };

  return {
    ...payments,
    captures,
    releases,
    /** Makes the next capture fail, like a reservation that lapsed at the bank. */
    failNextCapture() {
      failCapture = true;
    },
  };
}
