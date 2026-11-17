import {
  type Cafe,
  type Coordinates,
  createApiClient,
  devServerHost,
  type DeclineReason,
  type MenuItem,
  type Order,
  type Track,
} from '@shoot/shared';
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

import { endSession, getToken } from '@/data/session';

/**
 * Where the server is: EXPO_PUBLIC_API_URL if set, else the computer running `npx expo start`
 * (Expo knows its Wi-Fi address) on the server's port, 4000. Same rule as the customer app.
 */
function findApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  // The code came from Metro on this computer; the server runs next to it, on port 4000.
  // Old and new React Native architecture expose it differently; one of the two is there.
  const sourceCode = NativeModules.SourceCode as
    { scriptURL?: string; getConstants?: () => { scriptURL?: string } } | undefined;
  const scriptUrl = sourceCode?.scriptURL ?? sourceCode?.getConstants?.().scriptURL;
  const host = devServerHost(Constants.expoConfig?.hostUri, scriptUrl) ?? 'localhost';
  return `http://${host}:4000`;
}

export const API_URL = findApiUrl();

const { request } = createApiClient({ baseUrl: API_URL, getToken, onUnauthorized: endSession });

export type Seller = { id: string; name: string; email: string; cafe: Cafe };

// Every call to the server, in one file. Screens and hooks never see URLs or HTTP.
// The endpoints are described in server/README.md ("Orders: the seller").

export function signIn(email: string, password: string) {
  return request<{ token: string; seller: Seller }>('/seller/auth/sign-in', {
    method: 'POST',
    json: { email, password },
  });
}

export function signOut() {
  return request<void>('/seller/auth/sign-out', { method: 'POST' });
}

export function getMe() {
  return request<Seller>('/seller/me');
}

/** The café's live orders, oldest first, then the last 20 finished ones. */
export function getQueue() {
  return request<Order[]>('/seller/orders');
}

export function acceptOrder(id: string) {
  return request<Order>(`/seller/orders/${id}/accept`, { method: 'POST' });
}

export function declineOrder(id: string, reason: DeclineReason) {
  return request<Order>(`/seller/orders/${id}/decline`, { method: 'POST', json: { reason } });
}

export function startDelivery(id: string) {
  return request<Order>(`/seller/orders/${id}/on-my-way`, { method: 'POST' });
}

export function markDelivered(id: string) {
  return request<Order>(`/seller/orders/${id}/delivered`, { method: 'POST' });
}

export function registerPushToken(token: string) {
  return request<void>('/seller/push-token', { method: 'POST', json: { token } });
}

/** The WebSocket address for live order updates, or null when signed out. */
export function liveUrl(token: string | null) {
  return token ? `${API_URL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}` : null;
}

/** The seller's position during the walk. Sent by the background task (location/). */
export function sendPosition(id: string, coordinates: Coordinates) {
  return request<void>(`/seller/orders/${id}/position`, { method: 'POST', json: coordinates });
}

/** The latest positions of an order on its way (the customer's live dot). */
export function getTrack(id: string) {
  return request<Track>(`/seller/orders/${id}/track`);
}

/** The Menu tab: every item, sold-out ones too. */
export function getMenu() {
  return request<MenuItem[]>('/seller/menu');
}

export type MenuItemChanges = { soldOut?: boolean; priceCents?: number; description?: string };

/** Sold out or back, a new price, a new description. Answers with the item as saved. */
export function updateMenuItem(id: string, changes: MenuItemChanges) {
  return request<MenuItem>(`/seller/menu-items/${id}`, { method: 'PATCH', json: changes });
}

/** "Pause orders" and "Sell from here". Answers with the café as saved. */
export function updateCafe(changes: { isPaused?: boolean; coordinates?: Coordinates }) {
  return request<Cafe>('/seller/cafe', { method: 'PATCH', json: changes });
}
