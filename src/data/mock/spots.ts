import type { Spot } from '@/data/types';

/**
 * Spot stickers. To test on a phone, make a QR code from one of the `code` values
 * with any QR generator and scan it from your screen.
 */
export const MOCK_SPOTS: Spot[] = [
  {
    id: 'saari-table-4',
    cafeId: 'saaripaahtimo',
    label: 'Table 4, by the window',
    code: 'shoot-spot:saari-table-4',
  },
  {
    id: 'saari-bench-fountain',
    cafeId: 'saaripaahtimo',
    label: 'Bench by the fountain',
    code: 'shoot-spot:saari-bench-fountain',
  },
  {
    id: 'kampus-table-12',
    cafeId: 'kampuskuppi',
    label: 'Table 12, library terrace',
    code: 'shoot-spot:kampus-table-12',
  },
];
