// Turns database rows into the JSON the API sends. Rows use snake_case and store lists as
// JSON text; the API uses camelCase, real lists, and full image URLs.

export type CafeRow = {
  id: string;
  name: string;
  image: string;
  cover_image: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: number;
  open_until: string;
  is_open: number;
  ready_in_min: number;
  delivery_fee_cents: number;
  categories: string;
};

export type MenuItemRow = {
  id: string;
  cafe_id: string;
  name: string;
  description: string;
  price_cents: number;
  image: string | null;
  section: string;
  sold_out: number;
};

export type OrderRow = {
  id: string;
  number: number;
  user_id: string | null;
  cafe_id: string;
  cafe_name: string;
  cafe_image: string;
  lines: string;
  note: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  delivery: string;
  payment_label: string;
  status: string;
  created_at: string;
  ready_at: string;
  updated_at: string;
};

/** "/static/x.jpg" becomes "http://192.168.1.20:4000/static/x.jpg", the address the phone used. */
export function absolute(origin: string, path: string): string {
  return path.startsWith('http') ? path : `${origin}${path}`;
}

export function toCafe(row: CafeRow, origin: string) {
  return {
    id: row.id,
    name: row.name,
    image: absolute(origin, row.image),
    coverImage: absolute(origin, row.cover_image),
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    radiusM: row.radius_m,
    openUntil: row.open_until,
    isOpen: row.is_open === 1,
    readyInMin: row.ready_in_min,
    deliveryFeeCents: row.delivery_fee_cents,
    categories: JSON.parse(row.categories) as string[],
  };
}

export function toMenuItem(row: MenuItemRow, origin: string) {
  return {
    id: row.id,
    cafeId: row.cafe_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    ...(row.image ? { image: absolute(origin, row.image) } : {}),
    section: row.section,
    soldOut: row.sold_out === 1,
  };
}

type StoredLine = {
  itemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  image?: string;
  section: string;
};

type StoredDelivery =
  | { kind: 'spot'; spotLabel: string }
  | {
      kind: 'photos';
      selfie: string;
      spot: string;
      coordinates: { latitude: number; longitude: number };
    };

export function toOrder(row: OrderRow, origin: string) {
  const lines = (JSON.parse(row.lines) as StoredLine[]).map((line) => ({
    ...line,
    ...(line.image ? { image: absolute(origin, line.image) } : {}),
  }));
  const stored = JSON.parse(row.delivery) as StoredDelivery;
  const delivery =
    stored.kind === 'photos'
      ? {
          ...stored,
          selfie: absolute(origin, stored.selfie),
          spot: absolute(origin, stored.spot),
        }
      : stored;

  return {
    id: row.id,
    number: row.number,
    cafeId: row.cafe_id,
    cafeName: row.cafe_name,
    cafeImage: absolute(origin, row.cafe_image),
    lines,
    note: row.note,
    subtotalCents: row.subtotal_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    totalCents: row.total_cents,
    delivery,
    paymentLabel: row.payment_label,
    status: row.status,
    createdAt: row.created_at,
    readyAt: row.ready_at,
    updatedAt: row.updated_at,
  };
}
