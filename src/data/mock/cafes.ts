import type { Cafe } from '@/data/types';

/**
 * Where each mock café sits relative to the user, in metres.
 * The mock cafés are placed around wherever the device is, so the
 * in-range / out-of-range mix from the design works anywhere.
 */
export type MockOffset = { northM: number; eastM: number };

export const MOCK_CAFES: (Omit<Cafe, 'coordinates'> & { offset: MockOffset })[] = [
  {
    id: 'saaripaahtimo',
    name: 'Saaripaahtimo',
    image: require('@/assets/images/cafes/coffee-shop-3.jpg'),
    coverImage: require('@/assets/images/cafes/coffee-shop-3-cover.jpg'),
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
    image: require('@/assets/images/cafes/coffee-shop-1.jpg'),
    // The design has no wide cover for this café, so the square photo is cropped.
    coverImage: require('@/assets/images/cafes/coffee-shop-1.jpg'),
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
    image: require('@/assets/images/cafes/coffee-shop-2.jpg'),
    coverImage: require('@/assets/images/cafes/coffee-shop-2-cover.jpg'),
    offset: { northM: 210, eastM: -280 }, // 350 m away
    radiusM: 100,
    openUntil: '17:00',
    readyInMin: 12,
    deliveryFeeCents: 50,
    categories: ['coffee', 'pastry', 'lunch'],
  },
];
