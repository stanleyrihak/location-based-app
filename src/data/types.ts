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

/** One product line of an order, copied from the cart when the order was placed. */
export type OrderLine = {
  itemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  image?: number | string;
  section: MenuSection;
};

/** Received → Preparing → On the way → Delivered (tracking, 4.x, comes later). */
export type OrderStatus = 'received' | 'preparing' | 'on-the-way' | 'delivered';

export type Order = {
  id: string;
  /** Short and human, for the café and the user: "Order #2041". */
  number: number;
  cafeId: string;
  /** Copied, so past orders still show the name and photo if the café changes or closes. */
  cafeName: string;
  cafeImage: number | string;
  lines: OrderLine[];
  note: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** How the courier finds you: a scanned spot, or the two photos plus where you were. */
  delivery:
    | { kind: 'spot'; spotLabel: string }
    | { kind: 'photos'; selfie: number | string; spot: number | string; coordinates?: Coordinates };
  paymentLabel: string;
  status: OrderStatus;
  /** ISO date strings: they survive JSON, unlike Date objects, when a real backend sends them. */
  createdAt: string;
  readyAt: string;
};

/** What the app sends to place an order. The backend adds id, status and the times. */
export type NewOrder = Omit<Order, 'id' | 'number' | 'status' | 'createdAt' | 'readyAt'> & {
  readyInMin: number;
};
