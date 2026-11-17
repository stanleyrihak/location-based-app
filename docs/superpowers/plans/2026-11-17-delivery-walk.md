# Delivery walk (maps, live positions, Call) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After "On my way", the customer watches the seller walk over on a real map, the seller sees the delivery spot and the customer's live dot, and either side can call the other.

**Architecture:** Phones send positions to the server over HTTP (`POST …/position`), because the seller's position comes from a background task where the WebSocket is closed. The server keeps only the latest position per order in memory and forwards it over the existing WebSocket to the other side (`seller.position`, `customer.position`). Both apps draw one shared `DeliveryMap` from `@shoot/ui` on `expo-maps` (Apple Maps on iOS, Google Maps on Android).

**Tech Stack:** expo-maps ~58.0.11, expo-location (background updates with an Android foreground service), expo-task-manager, Hono, node:test.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (build order 3.2; sections Location, Real-time updates, Seller app, Customer app changes)

## Global Constraints

- Expo SDK 58, React Native 0.88, Expo Router, React Query. Node 26 on the laptop.
- Map library: `expo-maps` (the spec leaves it to the builder; it's Expo's own, Apple Maps needs no key, iOS 17+).
- Seller position: shared from "On my way" to "Delivered", also with the screen locked. It stops at "Delivered".
- Customer live position: sent only while the customer app is open and the order is `on-the-way`. It never moves the delivery spot.
- Positions are sent at most every 5 s (and only after moving 10 m). The server never stores positions in the database.
- Customer delivery spot = the position when paying, for both photo and spot-code orders.
- No by-hand phone checks during the tasks: the owner tests everything once at the end (Task 7 writes the checklist).
- Secrets: the Google Maps API key never goes into git (public repo). It comes from the env var `GOOGLE_MAPS_API_KEY`, locally and as an EAS environment variable.
- Copy style: the existing app's (short, plain, curly apostrophes in UI strings).

## Review Focus

1. A seller position that arrives after "Delivered" (the background task sends one more). Expected: 409 `status_conflict`, nothing forwarded, nothing kept. Test in Task 3.
2. A position for someone else's order (a customer guessing an id, a seller of another café). Expected: 404, nothing forwarded. Test in Task 3.
3. The customer opens the order screen in the middle of the walk (or the app reconnects). Expected: the seller's last position shows at once, from `GET /orders/:id/track`, without waiting for the next move. Test in Task 3.
4. Two position messages arrive out of order. Expected: the older one is ignored. Test in Task 1 (`applyPosition`).
5. The seller app is killed or restarted during a walk, or the order ends elsewhere. Expected: sharing follows the queue: it runs while the café has an `on-the-way` order and stops otherwise. Pure rule tested in Task 1 (`deliveringOrderId`); the start/stop wiring is checked by hand in the final run.

---

### Task 1: Shared types and helpers

**Files:**
- Modify: `packages/shared/src/types.ts`, `packages/shared/src/live.ts`, `packages/shared/src/live-connection.ts`, `packages/shared/src/orders.ts`
- Create: `packages/shared/src/map.ts`
- Test: `packages/shared/test/live.test.ts`, `packages/shared/test/live-connection.test.ts`, `packages/shared/test/orders.test.ts`, `packages/shared/test/map.test.ts`

**Interfaces:**
- Produces:
  - `type Position = { latitude: number; longitude: number; at: string }` (ISO time it was measured)
  - `type Track = { seller: Position | null; customer: Position | null }`
  - `type PositionMessage = { type: 'seller.position' | 'customer.position'; orderId: string; position: Position }`
  - `Order` gains `deliverTo: Coordinates`, `cafePhone: string`, `customerPhone: string`; the `photos` delivery loses its optional `coordinates`.
  - `applyPosition(track: Track | undefined, message: PositionMessage): Track` in `live.ts`
  - `deliveringOrderId(orders: Order[] | undefined): string | null` in `orders.ts`: the id of the `on-the-way` order, else null.
  - `fitCamera(points: Coordinates[]): { coordinates: Coordinates; zoom: number }` in `map.ts`
  - `createLiveConnection` options gain `onPosition?: (message: PositionMessage) => void`.

- [ ] **Step 1: Write the failing tests**

```ts
// live.test.ts
test('applyPosition puts the seller position into an empty track', () => {
  const track = applyPosition(undefined, msg('seller.position', '09:00:05'));
  assert.equal(track.seller?.at, at('09:00:05'));
  assert.equal(track.customer, null);
});
test('applyPosition ignores an older position than the one it has', () => {
  const track = applyPosition(applyPosition(undefined, msg('seller.position', '09:00:10')), msg('seller.position', '09:00:05'));
  assert.equal(track.seller?.at, at('09:00:10'));
});
// orders.test.ts
test('deliveringOrderId is the on-the-way order', () => {
  assert.equal(deliveringOrderId([o('a', 'preparing'), o('b', 'on-the-way')]), 'b');
  assert.equal(deliveringOrderId([o('a', 'delivered')]), null);
  assert.equal(deliveringOrderId(undefined), null);
});
// map.test.ts
test('fitCamera centres on one point at street zoom', () => {
  assert.deepEqual(fitCamera([{ latitude: 60.45, longitude: 22.27 }]), { coordinates: { latitude: 60.45, longitude: 22.27 }, zoom: 17 });
});
test('fitCamera centres between two points and zooms out to fit them', () => {
  const camera = fitCamera([{ latitude: 60.45, longitude: 22.27 }, { latitude: 60.452, longitude: 22.275 }]);
  assert.ok(Math.abs(camera.coordinates.latitude - 60.451) < 1e-9);
  assert.ok(camera.zoom < 17 && camera.zoom >= 14);
});
// live-connection.test.ts
test('passes on position messages', () => { /* message {type:'seller.position', orderId:'a', position} → onPosition called with it, onOrder not */ });
```

- [ ] **Step 2: Run** `npm test -w @shoot/shared`. Expected: FAIL (missing exports).
- [ ] **Step 3: Implement.** `fitCamera`: centre = middle of the bounding box; zoom = 17 for one point, else `clamp(14, 17, floor(log2(360 / spanDegrees)) - 1)` where span is the larger of the latitude span and the longitude span × cos(latitude). Update the types; fix every compile error the type change causes in the apps by reading `deliverTo` where they read `delivery.coordinates`.
- [ ] **Step 4: Run** `npm run check` at the root. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shared): positions, the delivering order and map camera helpers`

### Task 2: Server: delivery spot for every order, phone numbers

**Files:**
- Modify: `server/src/db/schema.ts` (cafes `phone TEXT NOT NULL DEFAULT ''`; orders `cafe_phone`, `customer_phone`, both `TEXT NOT NULL DEFAULT ''`), `server/src/db/seed.ts` (a phone per café, Finnish format like `+358 40 123 4567`), `server/src/domain/orders.ts` (store `coordinates` in the delivery JSON for both kinds; copy the café's phone and the customer's phone into the order), `server/src/views.ts` (`deliverTo`, `cafePhone`, `customerPhone`; cafe view gains `phone`), `server/README.md`
- Test: `server/test/order-routes.test.ts`

**Interfaces:**
- Consumes: the `Order` fields from Task 1.
- Produces: every order JSON has `deliverTo`, `cafePhone`, `customerPhone`.

- [ ] **Step 1: Failing test** `an order has the delivery spot, the café's phone and the customer's phone`: place a spot-code order at `HERE`; assert `order.deliverTo` equals `HERE`, `order.cafePhone` equals the seeded Saaripaahtimo number, `order.customerPhone` equals the signed-in customer's number.
- [ ] **Step 2: Run** `npm test -w @shoot/server`. Expected: FAIL.
- [ ] **Step 3: Implement.** The schema has no migrations: note in the commit and the README that a development database needs `npm run reset -w @shoot/server`.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): orders carry the delivery spot and both phone numbers`

### Task 3: Server: positions

**Files:**
- Create: `server/src/realtime/tracker.ts`, `server/test/positions.test.ts`
- Modify: `server/src/deps.ts` (`tracker: Tracker`), `server/src/main.ts`, `server/test/helpers.ts`, `server/src/realtime/hub.ts` (`positionChanged`), `server/src/domain/orders.ts` (`move()` calls `deps.tracker.forget(id)` when the new status isn't `on-the-way`), `server/src/routes/orders.ts`, `server/src/routes/seller-orders.ts`, `server/README.md`

**Interfaces:**
- Consumes: `Position`, `Track`, `PositionMessage` (Task 1).
- Produces:
  - `createTracker(): Tracker` with `set(orderId, who: 'seller' | 'customer', position: Position): void`, `get(orderId): Track`, `forget(orderId): void`
  - `hub.positionChanged(order: OrderRow, message: PositionMessage): void`: `seller.position` only to the order's customer, `customer.position` only to the café's sellers.
  - `POST /seller/orders/:id/position` `{ latitude, longitude }` → 204
  - `POST /orders/:id/position` `{ latitude, longitude }` → 204
  - `GET /orders/:id/track` and `GET /seller/orders/:id/track` → `Track` (both null unless `on-the-way`)
  - Errors: 404 `not_found` for an order that isn't yours; 409 `status_conflict` unless `on-the-way`; 400 for coordinates outside -90..90 / -180..180. The server stamps `at` with `deps.now()`.

- [ ] **Step 1: Failing tests** in `positions.test.ts` (use `realtime.test.ts`'s `start()`/`connect()` pattern for socket tests):
  - `the customer gets the seller's position while the order is on the way` (socket message `{ type: 'seller.position', orderId, position: { latitude, longitude, at } }`)
  - `the café gets the customer's position, and the customer doesn't get their own`
  - `a position after Delivered is refused with 409 and not forwarded` (Review Focus 1)
  - `a position for another café's order is 404` and `a customer can't post to someone else's order (404)` (Review Focus 2)
  - `track returns the last positions while on the way, and nothing after Delivered` (Review Focus 3)
- [ ] **Step 2: Run** `npm test -w @shoot/server`. Expected: FAIL.
- [ ] **Step 3: Implement.** Tracker is a `Map<string, Track>`.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): live positions during the walk`

### Task 4: `@shoot/ui`: DeliveryMap, CallButton, positions in the live hook

**Files:**
- Create: `packages/ui/src/components/delivery-map.tsx`, `packages/ui/src/components/call-button.tsx`
- Modify: `packages/ui/src/index.ts`, `packages/ui/package.json` (peer `expo-maps`), `packages/ui/src/hooks/use-live-orders.ts`, both apps' `package.json` (`npx expo install expo-maps` in each app), `apps/seller/app.config.ts` and a new `apps/customer/app.config.ts` (`android.config.googleMaps.apiKey: process.env.GOOGLE_MAPS_API_KEY`)

**Interfaces:**
- Consumes: `fitCamera`, `Track`, `PositionMessage`, `applyPosition` (Task 1).
- Produces:
  - `type MapPlace = { id: string; kind: 'cafe' | 'spot'; coordinates: Coordinates; title: string }`
  - `type MapDot = { id: string; kind: 'seller' | 'customer'; coordinates: Coordinates }`
  - `<DeliveryMap places={MapPlace[]} dots={MapDot[]} showMyLocation={boolean} style={…} accessibilityLabel={string} />`: fixed places are markers (Apple: `systemImage` `cup.and.saucer.fill` for the café and `mappin` for the spot, tinted with theme colours); live dots are small filled circles (radius 6 m) in `theme.accent` for the seller and `theme.ink` for the customer; the camera comes from `fitCamera` over all places and dots, set once on mount.
  - `<CallButton phone={string} label={string} />`: a `Button variant="text"` with the phone icon that opens `tel:<phone without spaces>`; hidden when `phone` is empty.
  - `useLiveOrders` writes each `PositionMessage` into the cache key `['track', orderId]` with `applyPosition`. `trackKey(orderId: string)` is exported for the screens.

- [ ] **Step 1:** Install `expo-maps` in both apps (`npx expo install expo-maps` in `apps/customer` and `apps/seller`). Add the `expo-maps` plugin with `requestLocationPermission: false` (the apps already ask through expo-location).
- [ ] **Step 2:** Implement the components and the hook change. There's no React Native test runner: the pure parts were tested in Task 1.
- [ ] **Step 3: Run** `npm run check`, `npx expo lint` in both apps, and `npx expo export --platform android` in `apps/seller` (output to the scratchpad). Expected: all pass, the bundle builds.
- [ ] **Step 4: Commit** `feat(ui): delivery map and call button on expo-maps`

### Task 5: Customer app: order status screen (4.2)

**Files:**
- Create: `apps/customer/src/app/order/[id].tsx`, `apps/customer/src/hooks/use-share-my-position.ts`
- Modify: `apps/customer/src/data/api.ts` (`getTrack(orderId): Promise<Track>`, `sendMyPosition(orderId, coordinates): Promise<void>`), `apps/customer/src/data/queries.ts` (`useTrack(orderId, enabled)` under `trackKey(orderId)`, refetch every 30 s while live and not connected), `apps/customer/src/components/order-card.tsx` (tap opens `/order/[id]`), `apps/customer/src/app/_layout.tsx` (register the route)

**Interfaces:**
- Consumes: `DeliveryMap`, `CallButton`, `trackKey` (Task 4); `GET /orders/:id/track`, `POST /orders/:id/position` (Task 3).
- Produces: route `/order/[id]`.

- Screen content, top to bottom: back, "Order #2044" and the status line (reuse the Orders tab's status wording), the map (place: the delivery spot "Your spot"; dots: the seller while `on-the-way`; `showMyLocation` true), ready time once accepted ("Arrives around 14:35"), the items, `CallButton phone={order.cafePhone} label={`Call ${order.cafeName}`}`. End states keep the existing card wording; their full screens are build step 4.
- `useShareMyPosition(order)`: while the screen is open, the app is active and `order.status === 'on-the-way'`, `Location.watchPositionAsync({ accuracy: High, timeInterval: 5000, distanceInterval: 10 })` and `sendMyPosition` for each fix (errors ignored); stop otherwise.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Run** `npm run check`, `npx expo lint`, and `npx tsc --noEmit` after a short `npx expo start` so typed routes include `/order/[id]`. Expected: PASS.
- [ ] **Step 3: Commit** `feat(customer): order status screen with the map and Call`

### Task 6: Seller app: map, Call and position sharing in the background

**Files:**
- Create: `apps/seller/src/location/share-position.ts` (task definition, start, stop), `apps/seller/src/location/use-share-position.ts`
- Modify: `apps/seller/app.json` (`expo-location` plugin: `isAndroidBackgroundLocationEnabled: true`, `isAndroidForegroundServiceEnabled: true`, `locationWhenInUsePermission`), `apps/seller/package.json` (`npx expo install expo-location expo-task-manager`), `apps/seller/src/data/api.ts` (`sendPosition(orderId, coordinates)`, `getTrack(orderId)`), `apps/seller/src/app/_layout.tsx` (import `share-position.ts` at the top so the task is defined at start), `apps/seller/src/providers/live-orders-provider.tsx` (run `useSharePosition`), `apps/seller/src/app/order/[id].tsx` (map and Call), `apps/seller/src/providers/session-provider.tsx` (stop sharing on sign-out)

**Interfaces:**
- Consumes: `deliveringOrderId` (Task 1), `DeliveryMap`, `CallButton`, `trackKey` (Task 4), `POST /seller/orders/:id/position`, `GET /seller/orders/:id/track` (Task 3).
- Produces:
  - `SELLER_POSITION_TASK = 'seller-position'`; the task reads the order id from localStorage key `seller-delivering-order` and posts each location; on 409 or 404 it stops the updates.
  - `startSharing(orderId: string): Promise<'background' | 'foreground' | 'denied'>`: asks for foreground then background permission. With background permission it starts `Location.startLocationUpdatesAsync(SELLER_POSITION_TASK, { accuracy: High, timeInterval: 5000, distanceInterval: 10, foregroundService: { notificationTitle: 'Delivering order #<number>', notificationBody: 'Shoot shares your position with the customer until you mark it delivered.' } })`. Without it: `'foreground'` and the hook watches the position while the app is open.
  - `stopSharing(): Promise<void>` stops the updates (if running) and clears the stored id.
  - `useSharePosition(queue: Order[] | undefined)`: when `deliveringOrderId(queue)` changes it starts or stops sharing (Review Focus 5). Returns the mode so the order screen can say "Keep Shoot open: without “Allow all the time”, the customer only sees you while it’s open." in `'foreground'` mode.
- Order screen: map with places (selling point "Your stand" from the seller's café, delivery spot "Customer") and dots (the customer while `on-the-way`), `showMyLocation` true; `CallButton phone={order.customerPhone} label="Call the customer"` under the delivery block.

- [ ] **Step 1:** Install and configure; implement.
- [ ] **Step 2: Run** `npm run check`, `npx expo lint`, `npx expo export --platform android`. Expected: PASS.
- [ ] **Step 3: Commit** `feat(seller): map, Call and position sharing during the walk`

### Task 7: Builds, owner steps, docs

**Files:**
- Modify: `README.md` (the final test checklist; how to set `GOOGLE_MAPS_API_KEY`), `apps/seller/AGENTS.md`, `apps/customer/AGENTS.md`, `server/README.md`

- [ ] **Step 1: Owner step.** Create a Google Maps API key (Google Cloud → enable "Maps SDK for Android" → API key restricted to Android app `com.stanleyr.shootseller` and the SHA-1 from EAS → Credentials). The owner adds it with `npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --value <key> --environment development --visibility sensitive` in `apps/seller`, and in `apps/seller/.env.local` for local builds, so it never enters the chat or git.
- [ ] **Step 2:** Queue a new seller development build (`npx -y eas-cli@latest build --profile development --platform android --non-interactive --no-wait`) and check its log for the Maps key. Expected: finished; the APK link goes to the owner.
- [ ] **Step 3:** Write the final test checklist into the README: everything from the seller-orders plan's deferred checks plus this plan's: map shows on both phones; "On my way" asks for location "Allow all the time"; the customer sees the seller's dot move with the seller's screen locked; the seller sees the customer's dot; Delivered stops the Android location notification; Call opens the dialler on both sides; kill the seller app mid-walk and reopen.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `docs: delivery walk, Maps key and the final test checklist`
