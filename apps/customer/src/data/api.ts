import type { Cafe, Coordinates, MenuItem, Order, Spot } from '@shoot/shared';
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

/**
 * 2.8 "Confirm payment": uploads the photos, then asks the server to charge and place the
 * order in one step. The server's "no" answers become errors the screens know.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
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

  try {
    return await request<Order>('/orders', { method: 'POST', json: { ...input, delivery } });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === 'payment_declined') throw new PaymentDeclinedError();
      if (error.code === 'out_of_range') throw new OutOfRangeError();
      if (error.code === 'sold_out') throw new SoldOutError(error.details.itemIds as string[]);
    }
    throw error;
  }
}

/** The user's orders, newest first. */
export function getOrders() {
  return request<Order[]>('/orders');
}

// ── Development only ─────────────────────────────────────────────────────

/** Marks an item as sold out on the server, to try E6. The route only exists in development. */
export function sellOutForTesting(itemId: string) {
  return request<void>('/dev/sell-out', { method: 'POST', json: { itemId } });
}
