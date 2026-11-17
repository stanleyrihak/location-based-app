export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CafeCategory = 'coffee' | 'pastry' | 'lunch';

export type Cafe = {
  id: string;
  name: string;
  /** An image URL from the server. */
  image: string;
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
  coverImage: string;
  isOpen: boolean;
  /** "Pause orders": visible, but not taking orders right now. */
  isPaused: boolean;
  /** For the Call button: "+358 40 123 4501". */
  phone: string;
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
  image?: string;
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
  image?: string;
  section: MenuSection;
};

/** Received → Preparing → On the way → Delivered (tracking, 4.x, comes later). */
/**
 * What customers and sellers see. Received → Preparing → On the way → Delivered, or it ends
 * early: declined by the café, expired (not accepted within 5 minutes), cancelled by the customer.
 */
export type OrderStatus =
  'received' | 'preparing' | 'on-the-way' | 'delivered' | 'declined' | 'expired' | 'cancelled';

/** Why a café declined an order. */
export type DeclineReason = 'sold-out' | 'too-busy' | 'closing-soon' | 'other';

export type Order = {
  id: string;
  /** Short and human, for the café and the user: "Order #2041". */
  number: number;
  cafeId: string;
  /** Copied, so past orders still show the name and photo if the café changes or closes. */
  cafeName: string;
  cafeImage: string;
  lines: OrderLine[];
  note: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** How the courier finds you: a scanned spot, or the two photos plus where you were. */
  delivery:
    | { kind: 'spot'; spotLabel: string }
    | { kind: 'photos'; selfie: string; spot: string };
  /** Where to bring it: the customer's position when they paid. Moves only if they update it (E10). */
  deliverTo: Coordinates;
  /** For the Call buttons: the café's number for the customer, the customer's for the café. */
  cafePhone: string;
  customerPhone: string;
  paymentLabel: string;
  status: OrderStatus;
  /** ISO date strings: they survive JSON, unlike Date objects, when a real backend sends them. */
  createdAt: string;
  /** The café must accept before this, or the order expires. Null once that no longer applies. */
  acceptBy: string | null;
  acceptedAt: string | null;
  /** When it should reach you. Null until the café accepts: the time starts then. */
  readyAt: string | null;
  declineReason: DeclineReason | null;
  /** When anything about the order last changed. Live updates use it to skip stale messages. */
  updatedAt: string;
};

/** Where a phone was, and when (an ISO date string). Sent during the delivery walk only. */
export type Position = Coordinates & { at: string };

/** The latest positions of an order on its way. Null until that side has sent one. */
export type Track = { seller: Position | null; customer: Position | null };

/** A position over the live connection: the seller's goes to the customer, and back. */
export type PositionMessage = {
  type: 'seller.position' | 'customer.position';
  orderId: string;
  position: Position;
};
