import type { PaymentMethod } from '@/payments/payment-methods';

/** Thrown when the bank says no. The user hasn't been charged. */
export class PaymentDeclinedError extends Error {
  constructor() {
    super('Payment declined');
    this.name = 'PaymentDeclinedError';
  }
}

/**
 * A pretend payment: waits like a real one, then succeeds, or fails for the test card 0002.
 *
 * Swapping in Stripe later changes only this file. The real version would ask our server
 * (an Expo Router API route, so the secret key never ships inside the app) for a payment
 * intent, then confirm it with Stripe's SDK and Apple Pay or Google Pay.
 */
export async function pay(
  amountCents: number,
  method: PaymentMethod,
): Promise<{ paymentId: string }> {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  if (method.id === 'card-0002') {
    throw new PaymentDeclinedError();
  }
  return { paymentId: `mock-pay-${Date.now()}-${amountCents}` };
}
