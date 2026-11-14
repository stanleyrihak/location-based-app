import { LegalDocument, type LegalSection } from '@/components/legal-document';

const SUMMARY = [
  'Shoot connects you with cafés in Oulu. The café makes your order and brings it to your spot.',
  'You sign in with your phone number. Keep your phone and SMS codes to yourself.',
  'Be at the spot you confirmed. If the courier can’t find you, you collect the order at the counter.',
  'You pay when you place the order. Food can’t be returned, but we refund what went wrong.',
];

const SECTIONS: LegalSection[] = [
  {
    title: 'About Shoot',
    paragraphs: [
      'Shoot is an app for ordering food and drinks from partner cafés in Oulu, Finland, and having them delivered to the exact spot where you are, such as a table, a bench or a lecture hall.',
      'Shoot runs the app. The café sells you the products, prepares them and delivers them. When you order, you buy from the café, and Shoot handles the order and the payment on the café’s behalf.',
    ],
  },
  {
    title: 'Your account',
    bullets: [
      'You need to be at least 16 years old to use Shoot.',
      'You sign in with a Finnish or other supported phone number and a one-time code we send by SMS.',
      'You are responsible for everything ordered from your account. Don’t share your codes with anyone.',
      'You can delete your account at any time in Profile. Order receipts we have to keep by law are kept after that.',
    ],
  },
  {
    title: 'Ordering',
    bullets: [
      'You can only order from cafés whose delivery range you are in. Cafés outside your range can still be browsed.',
      'Prices in the app include VAT. Delivery fees are shown in the cart before you pay.',
      'The order is binding once the café accepts it. If an item is sold out, the café removes it and you are not charged for it.',
      'Allergen and ingredient information comes from the café. If you have an allergy, message the café before ordering.',
    ],
  },
  {
    title: 'Your spot',
    paragraphs: [
      'To deliver to you, the café needs to know your exact spot. You confirm it with your location and a photo of your surroundings, or by scanning the Shoot QR code at your table.',
    ],
    bullets: [
      'Stay at the spot until the order arrives, or update your spot in the app.',
      'If you leave the delivery range while the order is being prepared, it will be ready for pick-up at the counter instead.',
      'If the courier can’t find you and you don’t answer messages, the order waits for you at the counter. It is not refunded.',
    ],
  },
  {
    title: 'Payment',
    paragraphs: [
      'You pay with Apple Pay, Google Pay or a payment card when you place the order. Payments are processed by our payment provider. Shoot never sees your full card number.',
      'If you start a group order, you pay for the whole order. How you split the cost with your friends is up to you.',
    ],
  },
  {
    title: 'Cancellations and refunds',
    bullets: [
      'You can cancel for free until the café starts preparing your order.',
      'Under Finnish consumer law, the 14-day right of withdrawal does not apply to food and drinks, because they spoil quickly.',
      'If something is missing, wrong or spoiled, tell us from the order screen within 24 hours. We refund the affected items to your original payment method.',
    ],
  },
  {
    title: 'Using Shoot fairly',
    bullets: [
      'Don’t place orders you don’t intend to collect.',
      'Keep messages with couriers about your delivery, and be respectful.',
      'Don’t use photos of other people when confirming your spot.',
      'We may suspend accounts that break these rules.',
    ],
  },
  {
    title: 'Liability',
    paragraphs: [
      'The café is responsible for the quality and safety of its products. Shoot is responsible for the app working as described. Neither is liable for losses caused by things outside reasonable control, such as network outages. Nothing in these terms limits your rights under Finnish consumer law.',
    ],
  },
  {
    title: 'Changes to these terms',
    paragraphs: [
      'If we change these terms, we will tell you in the app at least 14 days before the change takes effect. If you keep using Shoot after that, the new terms apply.',
    ],
  },
  {
    title: 'Disputes and contact',
    paragraphs: [
      'These terms are governed by Finnish law. If we can’t solve a problem together, you can take it to the Finnish Consumer Disputes Board (Kuluttajariitalautakunta).',
      'Questions? Write to support@shoot.example.',
    ],
  },
];

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Service"
      updated="14 November 2026"
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
