// Adds the global localStorage, backed by SQLite. Imported here too so this file doesn't
// depend on the onboarding provider having loaded first.
import 'expo-sqlite/localStorage/install';

import { MOCK_CAFES } from '@/data/mock/cafes';
import { MOCK_MENU } from '@/data/mock/menu';
import { MOCK_SPOTS } from '@/data/mock/spots';
import type { Cafe, Coordinates, MenuItem, NewOrder, Order, OrderStatus, Spot } from '@/data/types';
import { moveBy } from '@/utils/geo';

/** Pretend network time, so screens show their loading state like they will with a real backend. */
const FAKE_DELAY_MS = 400;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// The mock cafés are placed around the first location the app asks with,
// and then stay there. So if you walk away, the distance really changes.
let mockAnchor: Coordinates | null = null;

/** Cafés near `near`. The backend will decide what "near" means. The mock returns all of them. */
export async function getCafes(near: Coordinates): Promise<Cafe[]> {
  await wait(FAKE_DELAY_MS);

  mockAnchor ??= near;
  const anchor = mockAnchor;

  return MOCK_CAFES.map(({ offset, ...cafe }) => ({
    ...cafe,
    coordinates: moveBy(anchor, offset.northM, offset.eastM),
  }));
}

// Items sold out while the app runs. Real cafés sell out during the day; the mock menu never
// changes by itself, so the "Sell out an item (dev only)" button in the cart adds ids here (E6).
const soldOutIds = new Set<string>();

/** Development only: marks an item as sold out, to try E6 Item sold out. */
export function sellOutForTesting(itemId: string) {
  soldOutIds.add(itemId);
}

function withStock(items: MenuItem[]): MenuItem[] {
  return items.map((item) => (soldOutIds.has(item.id) ? { ...item, soldOut: true } : item));
}

/** One café's menu, in the order the café lists it. */
export async function getMenu(cafeId: string): Promise<MenuItem[]> {
  await wait(FAKE_DELAY_MS);
  return withStock(MOCK_MENU.filter((item) => item.cafeId === cafeId));
}

/**
 * Every product of the given cafés, for search on Home. A real backend would search on
 * the server; with three small mock menus, searching on the phone is simpler.
 */
export async function getMenuItems(cafeIds: string[]): Promise<MenuItem[]> {
  await wait(FAKE_DELAY_MS);
  return withStock(MOCK_MENU.filter((item) => cafeIds.includes(item.cafeId)));
}

/**
 * The spot a scanned QR code belongs to, or null when the code isn't a spot of this café
 * (another café's sticker, a random QR code, or a sticker that's no longer active).
 */
export async function getSpotByCode(cafeId: string, code: string): Promise<Spot | null> {
  await wait(FAKE_DELAY_MS);
  return MOCK_SPOTS.find((spot) => spot.code === code && spot.cafeId === cafeId) ?? null;
}

// The mock backend's orders, newest first. A real backend keeps them in its database; the
// mock keeps them in the phone's storage, so they survive closing the app. Only this file
// knows that: screens just call createOrder and getOrders, like they will with a server.
const ORDERS_KEY = 'mock-orders';
let mockOrders: Order[] = loadOrders();

function loadOrders(): Order[] {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    return saved ? (JSON.parse(saved) as Order[]) : [];
  } catch {
    // Unreadable data (for example from an older version of Order): start empty.
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(mockOrders));
}

/** Places an order (after it's paid) and returns it as the backend stored it. */
export async function createOrder(input: NewOrder): Promise<Order> {
  await wait(FAKE_DELAY_MS);

  const { readyInMin, ...rest } = input;
  const now = new Date();
  const order: Order = {
    ...rest,
    id: `order-${now.getTime()}`,
    number: 2041 + mockOrders.length,
    status: 'received',
    createdAt: now.toISOString(),
    readyAt: new Date(now.getTime() + readyInMin * 60_000).toISOString(),
  };
  mockOrders = [order, ...mockOrders];
  saveOrders();
  return order;
}

/** The user's orders, newest first, each with its status as of now. */
export async function getOrders(): Promise<Order[]> {
  await wait(FAKE_DELAY_MS);
  const now = Date.now();
  return mockOrders.map((order) => ({
    ...order,
    // A bundled image is saved as a number, an id that can change when the app is rebuilt.
    // So the café photo is looked up again instead of trusting the saved one.
    cafeImage: MOCK_CAFES.find((cafe) => cafe.id === order.cafeId)?.image ?? order.cafeImage,
    status: mockStatus(order, now),
  }));
}

/**
 * Nobody makes the coffee in the mock, so the status follows the clock instead:
 * received for the first minute, then preparing until ready, then 3 minutes on the way.
 * A real backend would store the status the café and courier set.
 */
function mockStatus(order: Order, now: number): OrderStatus {
  const created = Date.parse(order.createdAt);
  const ready = Date.parse(order.readyAt);
  if (now < created + 60_000) return 'received';
  if (now < ready) return 'preparing';
  if (now < ready + 3 * 60_000) return 'on-the-way';
  return 'delivered';
}
