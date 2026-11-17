// The test data: three cafés with their menus and spot stickers. Images are paths under
// public/, so the server can send them as URLs.

type SeedCafe = {
  id: string;
  name: string;
  image: string;
  coverImage: string;
  /** Where the café sits relative to the first user who asks, in metres. */
  offset: { northM: number; eastM: number };
  radiusM: number;
  openUntil: string;
  readyInMin: number;
  deliveryFeeCents: number;
  categories: string[];
};

type SeedItem = {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  priceCents: number;
  image?: string;
  section: 'coffee' | 'tea' | 'pastry' | 'lunch';
  soldOut?: boolean;
};

type SeedSpot = { id: string; cafeId: string; label: string; code: string };

const AMERICANO = '/static/images/menu/americano.jpg';
const CAPPUCCINO = '/static/images/menu/cappuccino.jpg';
const CROISSANT = '/static/images/menu/croissant.jpg';
const ESPRESSO = '/static/images/menu/espresso.jpg';

export const SEED_CAFES: SeedCafe[] = [
  {
    id: 'saaripaahtimo',
    name: 'Saaripaahtimo',
    image: '/static/images/cafes/coffee-shop-3.jpg',
    coverImage: '/static/images/cafes/coffee-shop-3-cover.jpg',
    offset: { northM: 36, eastM: 27 }, // 45 m away
    radiusM: 100,
    openUntil: '18:00',
    readyInMin: 10,
    deliveryFeeCents: 50,
    categories: ['coffee', 'pastry'],
  },
  {
    id: 'kampuskuppi',
    name: 'Kampuskuppi',
    image: '/static/images/cafes/coffee-shop-1.jpg',
    coverImage: '/static/images/cafes/coffee-shop-1.jpg',
    offset: { northM: -48, eastM: 64 }, // 80 m away
    radiusM: 100,
    openUntil: '20:00',
    readyInMin: 15,
    deliveryFeeCents: 50,
    categories: ['coffee', 'lunch'],
  },
  {
    id: 'torikahvila-ruska',
    name: 'Torikahvila Ruska',
    image: '/static/images/cafes/coffee-shop-2.jpg',
    coverImage: '/static/images/cafes/coffee-shop-2-cover.jpg',
    offset: { northM: 210, eastM: -280 }, // 350 m away
    radiusM: 100,
    openUntil: '17:00',
    readyInMin: 12,
    deliveryFeeCents: 50,
    categories: ['coffee', 'pastry', 'lunch'],
  },
];

export const SEED_MENU: SeedItem[] = [
  // Saaripaahtimo
  { id: 'saari-cappuccino', cafeId: 'saaripaahtimo', name: 'Cappuccino', description: 'Double shot, milk foam', priceCents: 420, image: CAPPUCCINO, section: 'coffee' },
  { id: 'saari-americano', cafeId: 'saaripaahtimo', name: 'Americano', description: 'Espresso topped up with hot water', priceCents: 360, image: AMERICANO, section: 'coffee' },
  { id: 'saari-espresso', cafeId: 'saaripaahtimo', name: 'Espresso', description: 'Sold out today', priceCents: 300, image: ESPRESSO, section: 'coffee', soldOut: true },
  { id: 'saari-green-tea', cafeId: 'saaripaahtimo', name: 'Green tea', description: 'Sencha, brewed to order', priceCents: 320, section: 'tea' },
  { id: 'saari-croissant', cafeId: 'saaripaahtimo', name: 'Croissant', description: 'Butter, baked this morning', priceCents: 350, image: CROISSANT, section: 'pastry' },
  { id: 'saari-korvapuusti', cafeId: 'saaripaahtimo', name: 'Korvapuusti', description: 'Cinnamon bun', priceCents: 380, section: 'pastry' },
  // Kampuskuppi
  { id: 'kampus-cappuccino', cafeId: 'kampuskuppi', name: 'Cappuccino', description: 'Single shot, milk foam', priceCents: 370, image: CAPPUCCINO, section: 'coffee' },
  { id: 'kampus-filter', cafeId: 'kampuskuppi', name: 'Filter coffee', description: 'Free refill at the counter', priceCents: 250, section: 'coffee' },
  { id: 'kampus-soup', cafeId: 'kampuskuppi', name: 'Soup of the day', description: 'With rye bread', priceCents: 890, section: 'lunch' },
  { id: 'kampus-sandwich', cafeId: 'kampuskuppi', name: 'Halloumi sandwich', description: 'Sourdough, pesto, tomato', priceCents: 790, section: 'lunch' },
  // Torikahvila Ruska
  { id: 'ruska-cappuccino', cafeId: 'torikahvila-ruska', name: 'Cappuccino', description: 'Double shot, milk foam', priceCents: 420, image: CAPPUCCINO, section: 'coffee' },
  { id: 'ruska-americano', cafeId: 'torikahvila-ruska', name: 'Americano', description: 'Espresso topped up with hot water', priceCents: 360, image: AMERICANO, section: 'coffee' },
  { id: 'ruska-espresso', cafeId: 'torikahvila-ruska', name: 'Espresso', description: 'Sold out today', priceCents: 300, image: ESPRESSO, section: 'coffee', soldOut: true },
  { id: 'ruska-black-tea', cafeId: 'torikahvila-ruska', name: 'Black tea', description: 'Earl grey or breakfast', priceCents: 300, section: 'tea' },
  { id: 'ruska-croissant', cafeId: 'torikahvila-ruska', name: 'Croissant', description: 'Butter, baked this morning', priceCents: 340, image: CROISSANT, section: 'pastry' },
  { id: 'ruska-salmon-soup', cafeId: 'torikahvila-ruska', name: 'Salmon soup', description: 'Lohikeitto with dill', priceCents: 1190, section: 'lunch' },
];

/**
 * Spot stickers. To test on a phone, make a QR code from one of the `code` values
 * with any QR generator and scan it from your screen.
 */
export const SEED_SPOTS: SeedSpot[] = [
  { id: 'saari-table-4', cafeId: 'saaripaahtimo', label: 'Table 4, by the window', code: 'shoot-spot:saari-table-4' },
  { id: 'saari-bench-fountain', cafeId: 'saaripaahtimo', label: 'Bench by the fountain', code: 'shoot-spot:saari-bench-fountain' },
  { id: 'kampus-table-12', cafeId: 'kampuskuppi', label: 'Table 12, library terrace', code: 'shoot-spot:kampus-table-12' },
];
