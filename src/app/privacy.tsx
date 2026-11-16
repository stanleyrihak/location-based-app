import { LegalDocument, type LegalSection } from '@/components/legal-document';

const SUMMARY = [
  'We use your location only while the app is open, to find cafés near you and deliver to your spot.',
  'Photos of your spot go only to the café handling that order, and are deleted 24 hours after delivery.',
  'We never sell your data and never see your full card number.',
  'You can see, download or delete your data at any time.',
];

const SECTIONS: LegalSection[] = [
  {
    title: 'Who we are',
    paragraphs: [
      'Shoot, based in Oulu, Finland, is the controller of your personal data under the EU General Data Protection Regulation (GDPR). You can reach us at privacy@shoot.example.',
    ],
  },
  {
    title: 'What we collect',
    bullets: [
      'Phone number: to sign you in with an SMS code and to let the café reach you about your order.',
      'Location: while you use the app, to show cafés that can deliver to you and to guide the courier to your spot.',
      'Spot photos and QR scans: to show the courier exactly where you are.',
      'Orders: what you ordered, from which café, when, and what you paid.',
      'Messages: what you and the courier write to each other about a delivery.',
      'Device data: app version, device model and crash reports, to fix problems.',
    ],
  },
  {
    title: 'Location',
    paragraphs: [
      'Shoot asks for your location only “While using the app”. We never track you in the background. Your exact location is shared with the café only while you have an active order.',
      'You can turn location off at any time in Settings › Shoot › Location. You can still browse café menus, but you can’t order, because the café needs to know where you are.',
    ],
  },
  {
    title: 'Why we use your data',
    bullets: [
      'To deliver your orders and handle payments (to fulfil our contract with you).',
      'To keep Shoot secure and prevent fraud (our legitimate interest).',
      'To improve the app with anonymous usage statistics (our legitimate interest, you can opt out in Profile).',
      'To keep receipts and accounting records (a legal obligation under Finnish law).',
    ],
  },
  {
    title: 'Who we share it with',
    bullets: [
      'The café preparing your order: your first name, phone number, order, spot and spot photos.',
      'Our payment provider, to process payments. They handle your card details, not us.',
      'Our SMS provider, to send sign-in codes.',
      'Our hosting provider, which stores data on servers in the EU.',
    ],
    paragraphs: ['We never sell your personal data or use it for advertising.'],
  },
  {
    title: 'How long we keep it',
    bullets: [
      'Spot photos: 24 hours after delivery.',
      'Messages with the courier: 30 days.',
      'Order history: until you delete your account.',
      'Receipts and payment records: as long as Finnish accounting law requires, usually 6 years.',
    ],
  },
  {
    title: 'Your rights',
    paragraphs: [
      'You have the right to see the data we have about you, correct it, download it, object to its use or have it deleted. Most of this you can do in Profile. For anything else, write to privacy@shoot.example and we will reply within 30 days.',
      'If you think we handle your data wrongly, you can complain to the Finnish Data Protection Ombudsman (Tietosuojavaltuutettu).',
    ],
  },
  {
    title: 'Changes to this policy',
    paragraphs: [
      'If we change how we use your data, we will tell you in the app before the change takes effect.',
    ],
  },
];

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="14 November 2026"
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}
