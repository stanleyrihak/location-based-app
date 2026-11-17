import type { Cafe, Coordinates, MenuItem, Order, Spot, Track } from '@shoot/shared';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { Image } from 'react-native';

import { ApiError, API_URL, authHeaders, request } from '@/data/http';
import { OutOfRangeError } from '@/data/use-check-range';

/**
 * Every call to the server, in one file. Screens and hooks call these functions and never
 * see URLs or HTTP: when the real backend arrives, only this file (and http.ts) change.
 * The endpoints are described in server/API.md.
 */

// ── Sign-in ──────────────────────────────────────────────────────────────

export type User = { id: string; phone: string; createdAt: string };

/** 1.2 "Send code". The phone number in the international form: "+358401234567". */
export function sendSmsCode(phone: string) {
  return request<void>('/auth/code', { method: 'POST', json: { phone } });
}

/** 1.3 "Verify". Returns the token to keep, and the user. */
export function verifySmsCode(phone: string, code: string) {
  return request<{ token: string; user: User }>('/auth/verify', {
    method: 'POST',
    json: { phone, code },
  });
}

export function getMe() {
  return request<User>('/me');
}

// ── Cafés and menus ──────────────────────────────────────────────────────

/** Cafés near `near`. The app works out each café's distance and whether it's in range. */
export function getCafes(near: Coordinates) {
  return request<Cafe[]>(`/cafes?latitude=${near.latitude}&longitude=${near.longitude}`);
}

/** One café's menu, in the order the café lists it. */
export function getMenu(cafeId: string) {
  return request<MenuItem[]>(`/cafes/${encodeURIComponent(cafeId)}/menu`);
}

/** Every product of the given cafés, for search on Home. */
export function getMenuItems(cafeIds: string[]) {
  return request<MenuItem[]>(`/menu-items?cafeIds=${cafeIds.map(encodeURIComponent).join(',')}`);
}

/**
 * The spot a scanned QR code belongs to, or null when the code isn't a spot of this café
 * (another café's sticker, a random QR code, or a sticker that's no longer active).
 */
export async function getSpotByCode(cafeId: string, code: string): Promise<Spot | null> {
  try {
    return await request<Spot>(
      `/cafes/${encodeURIComponent(cafeId)}/spot?code=${encodeURIComponent(code)}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === 'not_a_spot') return null;
    throw error;
  }
}

// ── Orders ───────────────────────────────────────────────────────────────

/** Thrown when the bank says no (402). The user hasn't been charged. */
export class PaymentDeclinedError extends Error {
  constructor() {
    super('Payment declined');
    this.name = 'PaymentDeclinedError';
  }
}

/** Thrown when the café paused orders ("Pause orders") between choosing it and paying. */
export class CafePausedError extends Error {
  constructor() {
    super('The café isn’t taking orders right now');
    this.name = 'CafePausedError';
  }
}

/** Thrown when something in the cart sold out after it was added (E6). */
export class SoldOutError extends Error {
  itemIds: string[];

  constructor(itemIds: string[]) {
    super('Some items sold out');
    this.name = 'SoldOutError';
    this.itemIds = itemIds;
  }
}

/** A photo as the app holds it: a file from the camera, or a bundled image (dev samples). */
type PhotoSource = string | number;

export type PlaceOrderInput = {
  cafeId: string;
  /** Only ids and quantities: the server looks up names and prices itself. */
  lines: { itemId: string; quantity: number }[];
  note: string;
  /** Where the phone is now. The server checks the range with it. */
  coordinates: Coordinates;
  delivery:
    { kind: 'spot'; spotCode: string } | { kind: 'photos'; selfie: PhotoSource; spot: PhotoSource };
  payment: { methodId: string; label: string };
  /** The total on screen. The server refuses the order if a price changed since. */
  expectedTotalCents: number;
};

/**
 * Uploads one photo and returns its address on the server.
 *
 * The body is the photo's bytes, sent as they are. A camera photo is a file on the phone
 * (file://), read with expo-file-system. A bundled sample photo is first fetched from the
 * bundle. The upload uses expo/fetch, which sends binary bodies reliably.
 */
async function uploadPhoto(source: PhotoSource): Promise<string> {
  const uri = typeof source === 'number' ? Image.resolveAssetSource(source)?.uri : source;
  if (!uri) {
    throw new ApiError(0, 'upload_failed', 'The photo couldn’t be read.');
  }
  const bytes = uri.startsWith('file:')
    ? await new File(uri).arrayBuffer()
    : await (await fetch(uri)).arrayBuffer();
  const file = uri.replace(/\?.*$/, '');
  const type = file.endsWith('.svg')
    ? 'image/svg+xml'
    : file.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

  let response;
  try {
    response = await expoFetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': type, ...authHeaders() },
      body: new Uint8Array(bytes),
    });
  } catch {
    throw new ApiError(0, 'network', 'We can’t reach the server. Check your connection.');
  }
  const body = (await response.json().catch(() => ({}))) as { path?: string; message?: string };
  if (!response.ok || !body.path) {
    throw new ApiError(
      response.status,
      'upload_failed',
      body.message ?? 'The photo didn’t upload.',
    );
  }
  return body.path;
}

/** Thrown when the spot code was valid at 2.6 but isn't any more (the café removed the sticker). */
export class SpotNotValidError extends Error {
  constructor() {
    super('The spot code isn’t valid any more');
    this.name = 'SpotNotValidError';
  }
}

/** The café changed a price since the cart was filled: nothing was charged. */
export class PriceChangedError extends Error {
  constructor() {
    super('Prices changed');
    this.name = 'PriceChangedError';
  }
}

/** The order changed while the screen was open (it ended, or the café moved it on). */
export class OrderChangedError extends Error {
  constructor() {
    super('This order changed in the meantime.');
    this.name = 'OrderChangedError';
  }
}

/** The server's "no" answers, as errors the screens know. Anything else stays an ApiError. */
function toAppError(error: unknown): unknown {
  if (!(error instanceof ApiError)) return error;
  switch (error.code) {
    case 'payment_declined':
      return new PaymentDeclinedError();
    case 'out_of_range':
      return new OutOfRangeError();
    case 'sold_out':
      return new SoldOutError(error.details.itemIds as string[]);
    case 'cafe_paused':
    case 'cafe_closed':
      return new CafePausedError();
    case 'not_a_spot':
      return new SpotNotValidError();
    case 'status_conflict':
      return new OrderChangedError();
    case 'price_changed':
      return new PriceChangedError();
    default:
      return error;
  }
}

/**
 * 2.8 "Confirm payment", step 1: uploads the photos, then the server checks the order and
 * reserves the money. Nothing is charged yet. Returns the new order's id and the secret
 * Stripe's payment sheet needs (null with the test server's fake payments).
 */
export async function startOrder(
  input: PlaceOrderInput,
): Promise<{ orderId: string; clientSecret: string | null }> {
  try {
    const delivery =
      input.delivery.kind === 'photos'
        ? {
            kind: 'photos' as const,
            // Both at once: each upload waits for the network, so in parallel is about twice as fast.
            ...Object.fromEntries(
              await Promise.all([
                uploadPhoto(input.delivery.selfie).then((path) => ['selfie', path]),
                uploadPhoto(input.delivery.spot).then((path) => ['spot', path]),
              ]),
            ),
          }
        : input.delivery;

    const { order, payment } = await request<{
      order: Order;
      payment: { clientSecret: string | null };
    }>('/orders', { method: 'POST', json: { ...input, delivery } });
    return { orderId: order.id, clientSecret: payment.clientSecret };
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Step 2, after the customer paid: the server checks the money is held and hands the order to
 * the café, which then has 5 minutes to accept.
 *
 * Safe to call again for the same order. If an earlier try reached the server but its answer
 * was lost (a timeout), the server says 409 "already received": then the order went through,
 * so it's fetched instead of showing an error.
 */
export async function confirmOrder(orderId: string): Promise<Order> {
  try {
    return await request<Order>(`/orders/${orderId}/confirm`, { method: 'POST' });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'status_conflict') {
      return request<Order>(`/orders/${orderId}`);
    }
    throw toAppError(error);
  }
}

/** The user's orders, newest first. */
export function getOrders() {
  return request<Order[]>('/orders');
}

export type NewSpot = {
  /** Where the phone is now: the new delivery spot. The server checks it's still in range. */
  coordinates: Coordinates;
  delivery: { kind: 'spot'; spotCode: string } | { kind: 'photo'; spot: PhotoSource };
};

/**
 * E10 "Moved to a different seat?": a new spot code, or a new spot photo (the selfie stays).
 * Uploads the photo first. Throws OutOfRangeError, SpotNotValidError or OrderChangedError.
 */
export async function updateSpot(orderId: string, input: NewSpot): Promise<Order> {
  try {
    const delivery =
      input.delivery.kind === 'photo'
        ? { kind: 'photo', spot: await uploadPhoto(input.delivery.spot) }
        : input.delivery;
    return await request<Order>(`/orders/${orderId}/spot`, {
      method: 'POST',
      json: { coordinates: input.coordinates, delivery },
    });
  } catch (error) {
    throw toAppError(error);
  }
}

/** The latest positions during the walk (the seller's, and yours as the server has it). */
export function getTrack(orderId: string) {
  return request<Track>(`/orders/${orderId}/track`);
}

/** Your position during the walk, for the seller's map. Only while the order is on its way. */
export function sendMyPosition(orderId: string, coordinates: Coordinates) {
  return request<void>(`/orders/${orderId}/position`, { method: 'POST', json: coordinates });
}

// ── Development only ─────────────────────────────────────────────────────

/** Marks an item as sold out on the server, to try E6. The route only exists in development. */
export function sellOutForTesting(itemId: string) {
  return request<void>('/dev/sell-out', { method: 'POST', json: { itemId } });
}
