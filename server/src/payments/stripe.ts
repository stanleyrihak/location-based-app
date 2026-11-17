import Stripe from 'stripe';

import type { Payments } from './types.ts';

/**
 * Real payments through Stripe (test mode with a `sk_test_…` key).
 *
 * `capture_method: 'manual'` is what makes "reserve now, charge on accept" work: paying in the
 * app only authorizes the amount, `capture` takes it, and `cancel` lets it go. Stripe holds an
 * uncaptured card payment for about 7 days, far longer than the 5-minute accept window.
 *
 * The secret key stays on the server. The app only gets the PaymentIntent's client secret,
 * which can confirm this one payment and nothing else.
 */
export function createStripePayments(secretKey: string): Payments {
  const stripe = new Stripe(secretKey);

  return {
    async reserve(amountCents) {
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'eur',
        capture_method: 'manual',
        // Lets Stripe offer what fits the phone: cards, and Google Pay on Android.
        automatic_payment_methods: { enabled: true },
      });
      return { paymentId: intent.id, clientSecret: intent.client_secret };
    },
    async isReserved(paymentId) {
      const intent = await stripe.paymentIntents.retrieve(paymentId);
      // "requires_capture" means the customer paid and the money is held for us.
      return intent.status === 'requires_capture';
    },
    async capture(paymentId) {
      await stripe.paymentIntents.capture(paymentId);
    },
    async release(paymentId) {
      await stripe.paymentIntents.cancel(paymentId);
    },
  };
}
