/**
 * Money for an order, in two steps: reserve when the customer pays, then capture (take it)
 * when the café accepts, or release it when the order ends without that.
 * Stripe (stripe.ts) and the fake used in development and tests (fake.ts) both do this.
 */
export interface Payments {
  /** Starts a payment. `clientSecret` is what the app's Stripe sheet needs; null when fake. */
  reserve(
    amountCents: number,
    methodId: string,
  ): Promise<{ paymentId: string; clientSecret: string | null }>;
  /** True once the customer has paid and the money is held. */
  isReserved(paymentId: string): Promise<boolean>;
  capture(paymentId: string): Promise<void>;
  release(paymentId: string): Promise<void>;
}
