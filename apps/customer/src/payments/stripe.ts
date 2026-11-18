import { Palette } from '@shoot/ui';
import {
  type AppearanceParams,
  initPaymentSheet,
  initStripe,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

/**
 * Stripe's sheet in Shoot's colours, so it reads as part of the app: cream background, white
 * fields, brown text and the same brown pill button as our pay sheet. The font stays the
 * system one: Inter is loaded at runtime, and Stripe's native sheet can't see it.
 */
const APPEARANCE: AppearanceParams = {
  // iOS 26 only. Stripe's own "Liquid Glass" preset: the sheet gets 34 pt corners (like our
  // other sheets) instead of 12, and a round glass close button. Stripe applies the preset
  // first and our colours and shapes below after it, so they still win. On older iPhones
  // and on Android, Stripe ignores it.
  applyLiquidGlass: true,
  colors: {
    primary: Palette.brown,
    background: Palette.cream,
    componentBackground: Palette.white,
    // Stripe takes hex only: this is the theme's line colour (brown at 14%) laid on white.
    componentBorder: '#E6E1E0',
    componentDivider: '#E6E1E0',
    primaryText: Palette.brown,
    secondaryText: Palette.brownSoft,
    componentText: Palette.brown,
    placeholderText: Palette.brownFaint,
    icon: Palette.brownSoft,
    error: Palette.rust,
  },
  shapes: { borderRadius: 14, borderWidth: 1 },
  primaryButton: {
    colors: { background: Palette.brown, text: Palette.cream, border: Palette.brown },
    shapes: { borderRadius: 28, height: 56 },
  },
};

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
    appearance: APPEARANCE,
    returnURL: `${String(Constants.expoConfig?.scheme)}://stripe-redirect`,
    defaultBillingDetails: { address: { country: 'FI' } },
    // Android only (iPhone has no Google Pay). Test keys need Google's test environment.
    googlePay: {
      merchantCountryCode: 'FI',
      currencyCode: 'EUR',
      testEnv: publishableKey.startsWith('pk_test_'),
    },
  });
  if (init.error) {
    // In Metro's terminal too, with Stripe's code, to see why without guessing.
    console.warn('Stripe initPaymentSheet failed', init.error.code, init.error.message);
    throw new StripeSheetError(init.error.message);
  }

  const { error } = await presentPaymentSheet();
  if (error?.code === 'Canceled') throw new PaymentCancelledError();
  if (error) {
    console.warn('Stripe presentPaymentSheet failed', error.code, error.message);
    throw new StripeSheetError(error.message);
  }
}
