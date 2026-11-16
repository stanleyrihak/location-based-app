export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CafeCategory = 'coffee' | 'pastry' | 'lunch';

export type Cafe = {
  id: string;
  name: string;
  /** A local image (require) now, an image URL from the backend later. */
  image: number | string;
  coordinates: Coordinates;
  /** How far the café delivers, in metres. */
  radiusM: number;
  /** Closing time as "HH:MM", shown as "Open until 18:00". */
  openUntil: string;
  /** Minutes until an order is ready. */
  readyInMin: number;
  /** In cents: 50 means €0.50. */
  deliveryFeeCents: number;
  categories: CafeCategory[];
};
