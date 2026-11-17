# Seller app: orders arrive and get accepted (build step 3.1) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A real order goes from one phone to the other: the customer pays on the iPhone, the seller's Android phone rings, the seller accepts or declines within 5 minutes, and the customer's app shows the answer at once.

**Architecture:** A new Expo app `apps/seller` built from the customer app's design system. The design system moves into a new workspace `@shoot/ui` (theme and components; React Native only). Code without React Native (the HTTP client, order helpers) goes into `@shoot/shared`, where Node's test runner covers it. Both apps get live order updates from the server's WebSocket through one hook that writes into the React Query cache; polling stays as the fallback. Push notifications for the seller come last, because they need a development build and Firebase credentials; everything before works in Expo Go.

**Tech Stack:** Expo SDK 58, Expo Router, React Query 5, expo-notifications, npm workspaces, Node 26 test runner. Server unchanged except where a task says so.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (sections "Seller app", "Real-time updates", "Push notifications", "Order lifecycle"; build-order step 3.1).

## Global Constraints

- Seller on Android, customer on iPhone. No paid Apple account: the customer gets no push in this plan; live updates cover it while the app is open.
- The seller app is built from the existing design system: the same tokens (`Palette`, `Spacing`, `Radius`, `Type`), Inter and Shrikhand fonts, and components. No new visual language.
- Seller sign-in: email and password (`<café id>@shoot.test` / `shoot-demo` in development). No sign-up.
- Accept window: 5 minutes, shown as a countdown (`m:ss`) that the server's `acceptBy` drives. When it reaches 0 the order leaves "New" without the seller doing anything (the server expires it).
- Decline reasons, with these labels: `sold-out` "Sold out", `too-busy` "Too busy", `closing-soon` "Closing soon", `other` "Something else".
- One order per walk; the map and positions are step 3.2. This plan's order screen has no map.
- Seller app identity: name "Shoot Seller", slug `shoot-seller`, scheme `shootseller`, Android package `com.stanleyr.shootseller`, iOS bundle id `com.stanleyr.shootseller`.
- Every app change passes `npm run fix`, `npx tsc --noEmit` and `npx expo lint` in that app; the root `npm run check` passes.
- Claude may install packages and do git actions; pushing to GitHub and creating the EAS project and Firebase project are the owner's steps.

## Review Focus

1. The WebSocket drops (Wi-Fi switch, server restart, phone sleeps). Expected: the app reconnects with growing delays and refetches the orders once connected, so nothing is missed. Pure reconnect-delay function tested in Task 1; behaviour checked by hand in Task 9 by restarting the server.
2. An `order.updated` for an order not in the cached list (a new order) or with an older `updatedAt` than the cached one (messages out of order). Expected: new ones are added in the right place, older ones ignored. Tested in Task 1.
3. The countdown reaches 0 while the seller is on the order screen. Expected: Accept turns into "Not accepted in time" and can't be tapped; a late tap that slips through shows the server's `expired` answer, not a crash. Pure countdown tested in Task 1; screen checked in Task 6.
4. Seller's token expires or the account is removed. Expected: the seller app returns to sign-in (401), like the customer app.
5. A new order arrives while the seller app is open. Expected: one alert with sound, not two (local alert and push both). Checked in Tasks 7 and 8.

---

### Task 1: Shared HTTP client and order helpers

**Files:**
- Create: `packages/shared/src/api-client.ts`, `packages/shared/src/live.ts`, `packages/shared/test/api-client.test.ts`, `packages/shared/test/live.test.ts`
- Modify: `packages/shared/src/orders.ts`, `packages/shared/test/orders.test.ts`, `packages/shared/src/index.ts`, `apps/customer/src/data/http.ts`

**Interfaces:**
- Produces in `@shoot/shared`:
  - `class ApiError extends Error { status: number; code: string; details: Record<string, unknown> }` (moved from the customer app; same behaviour).
  - `createApiClient(options: { baseUrl: string; getToken: () => string | null; onUnauthorized: () => void; timeoutMs?: number }): { request<T>(path: string, init?: { method?: string; json?: unknown }): Promise<T>; authHeaders(): Record<string, string> }` — the customer app's `request` generalized; status 0 + code `network` when unreachable; calls `onUnauthorized` on 401.
  - `applyOrderUpdate(orders: Order[] | undefined, incoming: Order): Order[] | undefined` — replaces the order with the same id unless the cached `updatedAt` is newer; adds an unknown order; keeps the list sorted newest `createdAt` first; returns `undefined` when there is no list yet.
  - `reconnectDelayMs(attempt: number): number` — 1 s, 2 s, 4 s … capped at 30 s.
  - `secondsToAccept(order: Pick<Order, 'acceptBy'>, now: number): number | null` — whole seconds left, never below 0; null without `acceptBy`.
  - `formatCountdown(seconds: number): string` — `"4:05"`.
  - `type SellerQueue = { newOrders: Order[]; preparing: Order[]; onTheWay: Order[]; recent: Order[] }` and `groupSellerQueue(orders: Order[]): SellerQueue` — new, preparing and on-the-way oldest first (the longest waiting on top); `recent` = ended orders newest first.
  - `Order` gains `updatedAt: string` (the server already sends it).
- [ ] **Step 1: Failing tests**
  - `api-client.test.ts` (against a local `node:http` server on port 0): `sends the bearer token`; `204 resolves to undefined`; `401 calls onUnauthorized and throws ApiError 401`; `error body becomes code, message and details`; `unreachable server throws status 0 code network`.
  - `live.test.ts`: `adds an unknown order newest first`; `replaces a known order`; `ignores an older update`; `leaves an empty cache empty` (undefined in, undefined out); `reconnect delays double and cap at 30 s` (`[0,1,2,5,10].map(reconnectDelayMs)` → `[1000,2000,4000,30000,30000]`).
  - `orders.test.ts`: `countdown from acceptBy` (acceptBy now+65 s → 65, formatted `"1:05"`; past → 0; null → null); `queue groups and orders` (two received orders come out oldest first; a declined one lands in `recent`).
- [ ] **Step 2: Run** `npm test -w @shoot/shared` → FAIL (modules missing).
- [ ] **Step 3: Implement.** `apps/customer/src/data/http.ts` keeps its exports (`API_URL`, `ApiError`, `authHeaders`, `request`) by building them from `createApiClient` with the same timeout, token and `endSession`.
- [ ] **Step 4: Run** `npm run check` at the root → PASS, and the customer app still exports an iOS bundle (`npx expo export --platform ios --output-dir <scratch>` in `apps/customer`).
- [ ] **Step 5: Commit** `feat(shared): API client, live update and queue helpers`

### Task 2: `@shoot/ui` with the design system

**Files:**
- Create: `packages/ui/package.json` (`"name": "@shoot/ui"`, `"main": "src/index.ts"`, peer dependencies `react`, `react-native`, `react-native-svg`, `react-native-safe-area-context`, `expo-router`), `packages/ui/tsconfig.json` (extends `expo/tsconfig.base`, strict), `packages/ui/src/index.ts`
- Move (git mv) from `apps/customer/src` to `packages/ui/src`: `constants/theme.ts`, `hooks/use-theme.ts`, `hooks/use-keyboard-visible.ts`, `components/themed-text.tsx`, `themed-view.tsx`, `button.tsx`, `icon.tsx`, `icon-shapes.tsx`, `banner.tsx`, `text-field.tsx`, `page-header.tsx`, `form-screen.tsx`, `wordmark.tsx`
- Modify: every customer file importing them (65 files) to import from `@shoot/ui`; `apps/customer/package.json` (`"@shoot/ui": "*"`)

**Interfaces:**
- Produces: `@shoot/ui` exports everything those files exported (`Palette`, `Spacing`, `Radius`, `Type`, `CameraColors`, `Shadow`, `IconSize`, `NavigationTheme`, `useTheme`, `useKeyboardVisible`, `ThemedText`, `ThemedView`, `Button`, `Icon`, `IconName`, `Banner`, `TextField`, `PageHeader`, `FormScreen`, `Wordmark`, and the rest of each file's exports). Inside the package, files import each other relatively (no `@/` alias).
- [ ] **Step 1: Failing check** — change `apps/customer/src/components/cafe-card.tsx` to import `ThemedText` from `@shoot/ui`; `npx tsc --noEmit` in `apps/customer` → FAIL ("Cannot find module '@shoot/ui'").
- [ ] **Step 2: Create the package, move the files, rewrite their internal imports, update the customer imports, `npm install` at the root.**
- [ ] **Step 3: Verify** in `apps/customer`: `npm run fix`, `npx tsc --noEmit`, `npx expo lint` pass; the iOS export bundles; `git log --follow packages/ui/src/components/button.tsx` shows its history. Root `npm run check` passes.
- [ ] **Step 4: Commit** `refactor: design system into @shoot/ui`

### Task 3: Live order updates in the customer app

**Files:**
- Create: `packages/ui/src/hooks/use-live-orders.ts`
- Modify: `packages/ui/src/index.ts`, `apps/customer/src/app/_layout.tsx` (or the signed-in part of it), `apps/customer/src/data/queries.ts`

**Interfaces:**
- Consumes: `applyOrderUpdate`, `reconnectDelayMs` (Task 1).
- Produces: `useLiveOrders(options: { url: string | null; queryKey: readonly unknown[] }): { connected: boolean }` — opens `url` (null = off, e.g. signed out), on `order.updated` writes `applyOrderUpdate` into `queryKey`'s cache and also sets `['order', id]` if cached, reconnects with `reconnectDelayMs`, invalidates `queryKey` after every (re)connect, closes on unmount or when `url` changes. Pauses while the app is in the background (AppState) and reconnects on return.
- `useOrders` polls every 30 s only while live orders exist **and** the socket is not connected.
- [ ] **Step 1: Failing check** — import `useLiveOrders` from `@shoot/ui` in the customer layout; `npx tsc --noEmit` → FAIL.
- [ ] **Step 2: Implement** the hook; the customer app connects to `${API_URL.replace(/^http/, 'ws')}/ws?token=…` while signed in.
- [ ] **Step 3: Verify** checks pass; by hand with the server running: place an order on the iPhone, accept it with `curl` as the seller (server README), and the order-sent screen and Orders tab change to "Preparing" within a second without pulling.
- [ ] **Step 4: Commit** `feat: live order updates in the customer app`

### Task 4: Seller app shell and sign-in

**Files:**
- Create: `apps/seller/package.json` (`"name": "@shoot/seller"`, `"main": "expo-router/entry"`, scripts `start`, `android`, `ios`, `lint`, `fix`, `check` like the customer app; dependencies via `npx expo install` matching the customer app's versions: expo, expo-router, react, react-native, react-native-safe-area-context, react-native-screens, react-native-svg, react-native-gesture-handler, react-native-reanimated, react-native-worklets, expo-font, @expo-google-fonts/inter, @expo-google-fonts/shrikhand, expo-splash-screen, expo-status-bar, expo-constants, expo-sqlite, expo-image, @tanstack/react-query, plus `@shoot/shared` and `@shoot/ui`), `apps/seller/app.json` (identity from Global Constraints, `userInterfaceStyle: light`, plugins `expo-router`, `expo-sqlite`, splash in Palette orange with the wordmark, `typedRoutes` and `reactCompiler` on), `apps/seller/tsconfig.json`, `apps/seller/eslint.config.js` (copy of the customer's), `apps/seller/AGENTS.md` + `CLAUDE.md` link, `apps/seller/assets/` (icon and splash copied from the customer app for now)
- Create: `apps/seller/src/data/session.ts`, `apps/seller/src/data/api.ts`, `apps/seller/src/providers/session-provider.tsx`, `apps/seller/src/app/_layout.tsx`, `apps/seller/src/app/sign-in.tsx`, `apps/seller/src/app/(tabs)/_layout.tsx`, `apps/seller/src/app/(tabs)/index.tsx` (Orders, placeholder text in this task), `apps/seller/src/app/(tabs)/stand.tsx`
- Modify: root `README.md` and `AGENTS.md` layout table

**Interfaces:**
- Produces:
  - `api.ts`: `signIn(email, password): Promise<{ token: string; seller: Seller }>`, `getMe(): Promise<Seller>`, `getQueue(): Promise<Order[]>`, `acceptOrder(id)`, `declineOrder(id, reason: DeclineReason)`, `startDelivery(id)`, `markDelivered(id)`, `registerPushToken(token)`, all returning the server's `Order`; `type Seller = { id; name; email; cafe: Cafe }`. Built on `createApiClient`; base URL like the customer app (`EXPO_PUBLIC_API_URL` or Expo's `hostUri` with port 4000).
  - `SessionProvider` / `useSession(): { seller: Seller | null; signIn(email, password): Promise<void>; signOut(): Promise<void> }` — token in `localStorage` key `seller-session-token`; 401 anywhere signs out.
  - Routes: `sign-in` (protected by signed-out), `(tabs)` with Orders and Stand (protected by signed-in), using `Stack.Protected` like the customer app.
- Stand tab: café name, seller name and email, Sign out. (Pause and selling point are step 3.4.)
- [ ] **Step 1: Failing check** — `npm run check -w @shoot/seller` → FAIL (workspace missing).
- [ ] **Step 2: Scaffold**, install (`npx expo install …` inside `apps/seller`), write the files. Sign-in screen: `FormScreen` with Wordmark, "Sign in to your café", email and password `TextField`s, error text from the server's message, `Button` with `loading`.
- [ ] **Step 3: Verify** `npm run fix`, `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` in `apps/seller`; Android export bundles (`npx expo export --platform android --output-dir <scratch>`); by hand: `npx expo start` in `apps/seller`, open in Expo Go on Android, sign in as `saaripaahtimo@shoot.test` / `shoot-demo`, see the tabs; wrong password shows "Wrong email or password."; Sign out returns to sign-in.
- [ ] **Step 4: Commit** `feat(seller): app shell and sign-in`

### Task 5: Orders tab: the queue

**Files:**
- Create: `apps/seller/src/components/order-tile.tsx`, `apps/seller/src/components/countdown.tsx`, `apps/seller/src/data/queries.ts`
- Modify: `apps/seller/src/app/(tabs)/index.tsx`, `apps/seller/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `groupSellerQueue`, `secondsToAccept`, `formatCountdown` (Task 1); `useLiveOrders` (Task 3); seller `api.ts` (Task 4).
- Produces:
  - `useQueue()` — React Query `['seller-orders']` over `getQueue`, live via `useLiveOrders` with the seller token; polls every 30 s while the socket is down.
  - `useNow(intervalMs = 1000): number` in `countdown.tsx` — the time, re-rendered every second while mounted (keeps render pure).
  - `<OrderTile order onPress />` — order number, item count, "spot code"/"photos" mark, age or countdown; for `received`: `Countdown` plus Accept and Decline buttons.
- Screen: sections "New" (with countdown), "Making", "On the way", "Earlier today"; empty state "No orders yet. New ones appear here and ring the phone."; pull to refresh like the customer Orders tab.
- [ ] **Step 1: Failing check** — the Orders screen imports `useQueue`; `npx tsc --noEmit` → FAIL.
- [ ] **Step 2: Implement.** Accept and Decline call the mutations in Task 6's hook; Decline opens the reason sheet (Task 6). Until Task 6 exists, the buttons navigate to the order screen.
- [ ] **Step 3: Verify** checks pass; by hand: a customer order (from the iPhone or `bash server/scripts/smoke.sh`) appears under New within a second with a countdown that ticks; after accepting with `curl` it moves to Making.
- [ ] **Step 4: Commit** `feat(seller): live order queue`

### Task 6: Order screen, accept and decline

**Files:**
- Create: `apps/seller/src/app/order/[id].tsx`, `apps/seller/src/app/decline/[id].tsx` (form sheet), `apps/seller/src/data/use-order-actions.ts`
- Modify: `apps/seller/src/app/_layout.tsx` (register `order/[id]` and `decline/[id]` with `presentation: 'formSheet'`, `sheetAllowedDetents: 'fitToContents'`, grabber, corner radius 28, like the customer's pay sheet), `apps/seller/src/components/order-tile.tsx`

**Interfaces:**
- Consumes: seller `api.ts`, `applyOrderUpdate`.
- Produces: `useOrderActions(orderId): { accept; decline(reason); startDelivery; markDelivered }` — React Query mutations that write the returned order into `['seller-orders']` with `applyOrderUpdate`; server errors map to messages: `expired` → "Too late: the 5 minutes ran out. The customer wasn't charged.", `payment_failed` → "The payment didn't go through. Try again, or decline.", `status_conflict` → refetch the queue and say "This order already changed.".
- Order screen: number and age; delivery: spot label, or the two photos side by side (`expo-image`, tap to view full screen is out of scope); items with quantities; note; total; one main `Button` for the next step (`received` → "Accept" with the countdown in its label, `preparing` → "On my way", `on-the-way` → "Delivered"), and "Decline" as a text button while `received`. When the countdown is 0: no Accept, text "Not accepted in time".
- Decline sheet: the four reasons as radio rows (like the customer's payment methods), "Decline order" button (`variant` danger if the design has one, else ink), Cancel.
- [ ] **Step 1: Failing check** — the tile's Decline navigates to `/decline/[id]`; `npx tsc --noEmit` → FAIL (typed routes: route missing).
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Verify** checks pass; by hand, two phones and the server: order on the iPhone; on Android accept → the iPhone shows Preparing at once; second order: decline "Sold out" → the iPhone shows it under Earlier as Declined; third order: wait out the 5 minutes on the order screen → Accept disappears, "Not accepted in time".
- [ ] **Step 4: Commit** `feat(seller): order screen with accept and decline`

### Task 7: New-order alert while the app is open

**Files:**
- Create: `apps/seller/src/notifications/new-order-alert.ts`
- Modify: `apps/seller/src/app/_layout.tsx`, `packages/ui/src/hooks/use-live-orders.ts` (an `onUpdate(order, previous)` callback)

**Interfaces:**
- Produces: `alertNewOrder(order: Order): Promise<void>` — shows a local notification "New order #2044" / "2 items · accept within 5 minutes" with sound (expo-notifications `scheduleNotificationAsync` with `trigger: null`) and a vibration; `useLiveOrders` calls `onUpdate` with the previous cached version, and the seller app alerts only when an order becomes `received` (previous missing or not received).
- `Notifications.setNotificationHandler` shows foreground notifications, except remote pushes whose order id the live connection already alerted (Review Focus 5): the handler ignores a push with `data.orderId` seen in the last minute.
- Install `expo-notifications` with `npx expo install expo-notifications` in `apps/seller`; add the plugin to `app.json`; ask notification permission after sign-in.
- [ ] **Step 1: Failing check** — layout calls `alertNewOrder`; `npx tsc --noEmit` → FAIL.
- [ ] **Step 2: Implement.** Server: add `data: { orderId: order.id }` to every push message (`server/src/push/service.ts` and its test asserts it).
- [ ] **Step 3: Verify** server tests pass (`push.test.ts` asserts `data.orderId`); app checks pass; by hand in Expo Go on Android: with the seller app open on another tab, a customer order rings once.
- [ ] **Step 4: Commit** `feat(seller): sound and banner for new orders`

### Task 8: Push notifications to the seller's phone (development build)

**Files:**
- Modify: `apps/seller/app.json` (EAS `projectId` in `extra.eas`, Android `googleServicesFile`), `apps/seller/src/notifications/push-token.ts` (create), `apps/seller/src/providers/session-provider.tsx`, `apps/seller/eas.json` (create: `development` profile, `developmentClient: true`, Android `buildType: apk`)

**Interfaces:**
- Produces: `registerForPush(): Promise<string | null>` — asks permission, creates the Android channel "orders" (importance max, sound), gets the Expo push token with the project id, returns null when not allowed or on an emulator; after sign-in the provider sends it with `registerPushToken`. Sign-out already removes it on the server.
- [ ] **Step 1 (owner): Accounts**
  - In `apps/seller`: `npx eas-cli@latest init` (links the app to a new Expo project on your account; writes the project id into `app.json`).
  - Firebase: create a project, add an Android app with package `com.stanleyr.shootseller`, download `google-services.json` into `apps/seller/` (git-ignored), and upload the FCM V1 service-account key to the Expo project (`npx eas-cli@latest credentials`, Android, "Google Service Account Key for Push Notifications (FCM V1)"), following https://docs.expo.dev/push-notifications/fcm-credentials/.
- [ ] **Step 2: Implement** `push-token.ts` and the provider call; `.gitignore` gets `google-services.json`.
- [ ] **Step 3 (owner): Build and install** — `npx eas-cli@latest build --profile development --platform android` in `apps/seller`, install the APK from the link on the Android phone, start with `npx expo start --dev-client`.
- [ ] **Step 4: Verify** — the server log shows `POST /seller/push-token 204` after sign-in; lock the Android phone, place an order on the iPhone: a "New order" notification with sound arrives on the lock screen; tapping it opens the order screen (handle `addNotificationResponseReceivedListener` → `router.push('/order/[id]')`).
- [ ] **Step 5: Commit** `feat(seller): push notifications for new orders`

### Task 9: End to end, docs

**Files:**
- Modify: `README.md` (how to run both apps and the server, the dev accounts, the two-phone demo), `apps/seller/AGENTS.md`, `server/README.md` (push `data.orderId`)

- [ ] **Step 1: Two-phone run** — server with fake payments; iPhone customer app; Android seller app (development build). Order → ring → accept → customer sees Preparing; decline path; expiry path; restart the server mid-way (Review Focus 1): both apps reconnect within 30 s and show the right statuses.
- [ ] **Step 2: Root checks** `npm run check` → PASS.
- [ ] **Step 3: Commit** `docs: two-phone demo of orders arriving and being accepted`
