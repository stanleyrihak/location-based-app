import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

/** The customer closed Stripe's sheet: nothing was paid, and that's not an error to show. */
export class PaymentCancelledError extends Error {
  constructor() {
    super('Payment cancelled');
    this.name = 'PaymentCancelledError';
  }
}

/** The server uses Stripe but has no publishable key (STRIPE_PUBLISHABLE_KEY) for the app. */
export class PaymentsNotSetUpError extends Error {
  constructor() {
    super('Payments aren’t set up on this server.');
    this.name = 'PaymentsNotSetUpError';
  }
}

/** Stripe's sheet couldn't take the payment (it shows the details itself). */
export class StripeSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeSheetError';
  }
}

let initialisedWith: string | null = null;

/**
 * Reserves the money with Stripe's own payment sheet, for one PaymentIntent the server created
 * (manual capture: the café takes it only when it accepts). Stripe draws the card form and
 * Google Pay; the card number never touches our app or server.
 */
export async function payWithStripe(publishableKey: string | null, clientSecret: string) {
  if (!publishableKey) throw new PaymentsNotSetUpError();
  if (initialisedWith !== publishableKey) {
    // urlScheme: where a bank's 3-D Secure page sends the customer back to.
    await initStripe({ publishableKey, urlScheme: String(Constants.expoConfig?.scheme) });
    initialisedWith = publishableKey;
  }

  const init = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'Shoot',
    returnURL: `${String(Constants.expoConfig?.scheme)}://stripe-redirect`,
    defaultBillingDetails: { address: { country: 'FI' } },
  });
  if (init.error) throw new StripeSheetError(init.error.message);

  const { error } = await presentPaymentSheet();
  if (error?.code === 'Canceled') throw new PaymentCancelledError();
  if (error) throw new StripeSheetError(error.message);
}
