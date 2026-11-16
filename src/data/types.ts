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
  /** The wide photo at the top of the menu (2.1). */
  coverImage: number | string;
};

/** Tabs on the café menu. Not the same as CafeCategory: the menu has Tea, the Home filter doesn't. */
export type MenuSection = 'coffee' | 'tea' | 'pastry' | 'lunch';

export type MenuItem = {
  id: string;
  cafeId: string;
  name: string;
  description: string;
  /** In cents, like every price in the app. */
  priceCents: number;
  /** Optional: items without a photo show a placeholder icon for their section. */
  image?: number | string;
  section: MenuSection;
  soldOut: boolean;
};

/** A table or bench with a QR code sticker, so the courier knows exactly where to go. */
export type Spot = {
  id: string;
  cafeId: string;
  /** Shown to the user and the courier: "Table 4, by the window". */
  label: string;
  /** What the QR code on the sticker contains. */
  code: string;
};
