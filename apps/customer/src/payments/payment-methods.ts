import type { IconName } from '@shoot/ui';
import { Platform } from 'react-native';

import { useConfig } from '@/data/queries';

export type PaymentMethod = {
  id: string;
  /** "Apple Pay", "Card ending in 4242". */
  label: string;
  /** Shorter, for the button and the payment sheet: "Apple Pay", "Card •••• 4242". */
  shortLabel: string;
  icon: IconName;
  /** The wallet gets the dark mark (`.pay-mark.ink`), cards the sand one. */
  isWallet: boolean;
};

/** Apple Pay on iPhone, Google Pay on Android: each phone's own wallet. */
const WALLET: PaymentMethod = {
  id: 'wallet',
  label: Platform.OS === 'android' ? 'Google Pay' : 'Apple Pay',
  shortLabel: Platform.OS === 'android' ? 'Google Pay' : 'Apple Pay',
  icon: 'wallet',
  isWallet: true,
};

function card(last4: string): PaymentMethod {
  return {
    id: `card-${last4}`,
    label: `Card ending in ${last4}`,
    shortLabel: `Card •••• ${last4}`,
    icon: 'card',
    isWallet: false,
  };
}

/**
 * The saved methods. A real backend (Stripe) would return the user's own cards.
 * 4242 is Stripe's test card number that pays.
 */
export const PAYMENT_METHODS: PaymentMethod[] = [WALLET, card('4242')];

/**
 * With Stripe, its payment sheet asks for the card (and offers Google Pay on Android), so the
 * app shows one method. Apple Pay needs a paid Apple developer account, so the iPhone gets cards.
 */
const STRIPE: PaymentMethod = {
  id: 'stripe',
  label: Platform.OS === 'android' ? 'Card or Google Pay' : 'Card',
  shortLabel: 'Card',
  icon: 'card',
  isWallet: false,
};

/** The methods 2.7 offers: Stripe's, or the fake ones while the server has no Stripe key. */
export function usePaymentMethods(): PaymentMethod[] {
  const config = useConfig();
  return config.data?.payments === 'stripe' ? [STRIPE] : PAYMENT_METHODS;
}
