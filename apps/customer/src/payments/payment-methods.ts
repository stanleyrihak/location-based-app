import type { ServerConfig } from '@/data/api';

/**
 * What the order says it was paid with. The server saves the label, and the café sees it:
 * "Reserved on Card".
 *
 * The app doesn't ask the customer to choose. With Stripe, its payment sheet offers the
 * methods (cards, Google Pay on Android, and Apple Pay once the app has an Apple merchant ID),
 * and it doesn't tell the app which one was used. So the label stays "Card".
 *
 * Without a Stripe key the server fakes the payment, and every order pays with a test card.
 */
export function paymentFor(mode: ServerConfig['payments']): { methodId: string; label: string } {
  return mode === 'stripe'
    ? { methodId: 'stripe', label: 'Card' }
    : { methodId: 'card-4242', label: 'Test card' };
}
