# Server foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the test server into the real one: seller accounts, the full order lifecycle (accept within 5 minutes, decline, expire, cancel, on my way, delivered) with Stripe reserve-then-charge, live updates over WebSocket, and push notifications, with the customer app adapted so it keeps working.

**Architecture:** `server/` moves from the hand-written router to Hono on Node. Everything with a side effect (database, payments, push, clock, uploads folder, live connections) is passed into `createApp(deps)`, so tests run the whole app in memory with fakes. The order rules live in one module (`domain/orders.ts`) that the HTTP routes call; every status change goes through it and emits one event, which feeds both the WebSocket hub and push.

**Tech Stack:** Node 26 (type stripping, `node:sqlite`, `node:test`), hono 4.13, @hono/node-server 2.1, @hono/node-ws 1.3, stripe 23.1, expo-server-sdk 8.0. Customer app: Expo SDK 58.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (sections "Order lifecycle", "Payments", "Real-time updates", "Push notifications", "The people and their devices"; build-order step 2).

## Global Constraints

- Statuses only move forward. Allowed moves: `pending-payment → received`, `pending-payment → abandoned`, `received → preparing | declined | expired | cancelled`, `preparing → on-the-way`, `on-the-way → delivered`. Anything else answers 409 `status_conflict`.
- Accept window: 5 minutes from `received` (`ACCEPT_WINDOW_MS = 300_000`). An unpaid `pending-payment` order is abandoned after 30 minutes.
- Ready time starts at accept: `readyAt = acceptedAt + café.readyInMin`.
- Decline reasons: `sold-out`, `too-busy`, `closing-soon`, `other`.
- Money is reserved when the customer pays and taken only on accept. Decline, expire, cancel and abandon release it. No Stripe webhooks.
- Prices come from the server's menu. The app sends item ids and quantities only.
- Photos are deleted when an order ends (`delivered`, `declined`, `expired`, `cancelled`, `abandoned`).
- Customers sign in with phone and SMS code (development code `123456`). Sellers sign in with email and password; accounts are created by a script.
- No clock-driven status changes. Only the seller and the timer change statuses.
- Server code stays dependency-light and commented in the existing style (why, not what). Imports use the `.ts` extension (Node type stripping).
- Without `STRIPE_SECRET_KEY` the server uses fake payments, so the customer app works before the Stripe payment sheet exists (step 4). Fake payments decline `methodId === 'card-0002'`.
- The database schema changes. Development data is reset (`npm run reset -w @shoot/server`); no migrations.
- Claude may install packages and do git actions. Commit after each task.

## Review Focus

1. A seller of café A accepting or reading an order of café B. Expected: 404 `order_not_found`, never the order. Test in Task 6.
2. Two accepts of the same order racing (double tap). Expected: the second gets 409 and the money is captured once. Test in Task 3.
3. Accept arriving after the 5-minute window but before the timer ran. Expected: 409 `expired`, the order expires, the money is released. Test in Task 3.
4. A WebSocket connected with a customer token receiving another customer's order. Expected: only the owner's orders arrive. Test in Task 7.
5. Stripe failing during capture (card reservation lapsed). Expected: the order stays `received`, the seller gets 402 `payment_failed`, nothing is marked preparing. Test in Task 3.

---

### Task 1: Hono app with injected dependencies

Rebuild the existing behaviour (sign-in, cafés, menus, spots, uploads, static files, dev routes) on Hono, with the database opened by a function instead of at import time. No behaviour changes except removing the clock auto-advance and the `X-Staff-Key` staff routes (Task 6 replaces them).

**Files:**
- Create: `server/src/app.ts`, `server/src/deps.ts`, `server/src/db/open.ts`, `server/src/db/schema.ts`, `server/test/helpers.ts`, `server/test/auth.test.ts`, `server/test/cafes.test.ts`
- Move: `server/src/seed.ts` → `server/src/db/seed.ts`
- Rewrite: `server/src/main.ts`, `server/src/routes/auth.ts`, `server/src/routes/cafes.ts`, `server/src/routes/files.ts`, `server/src/routes/dev.ts`
- Delete: `server/src/http.ts`, `server/src/db.ts`, `server/src/status.ts`, `server/src/routes/staff.ts`, `server/src/routes/orders.ts` (rebuilt in Task 6)
- Modify: `server/package.json`, `server/src/validate.ts` (throw `HttpError` from a new `server/src/errors.ts`)

**Interfaces:**
- Produces:
  - `type Deps = { db: DatabaseSync; payments: Payments; push: Push; hub: Hub; now: () => number; uploadsDir: string; publicDir: string; config: Config }` in `deps.ts` (Payments, Push, Hub as interfaces declared in Tasks 4, 7, 8; Task 1 declares them as empty placeholders `{}` typed interfaces and later tasks fill them).
  - `openDb(file: string): DatabaseSync` — `':memory:'` allowed; creates the schema and seeds an empty database.
  - `createApp(deps: Deps): Hono` in `app.ts`.
  - `class HttpError extends Error { status; code; details? }` in `errors.ts`; `app.onError` turns it into `{ error, message, ...details }`.
  - `createTestApp(): { app: Hono; deps: Deps; clock: { set(ms: number): void; advance(ms: number): void } }` in `test/helpers.ts`, using `openDb(':memory:')`, a temp uploads dir, fake payments and fake push.
  - `signInCustomer(app, phone = '+358401234567'): Promise<string>` (token) in `test/helpers.ts`.

- [ ] **Step 1: Install**

Run in the repo root: `npm install hono@^4.13.19 @hono/node-server@^2.1.9 @hono/node-ws@^1.3.1 -w @shoot/server`
Add scripts to `server/package.json`: `"test": "node --test test/"`, and `"check": "npm run types:check && npm test"`. Add `"test"` to `tsconfig.json` `include`.

- [ ] **Step 2: Write the failing tests**

`test/auth.test.ts`:
- `sign-in creates an account once`: POST `/auth/code` → 204; POST `/auth/verify` with `123456` → 200 with `token` and `user.phone === '+358401234567'`; doing it again returns the same `user.id`.
- `wrong code is rejected and counted`: verify with `000000` → 400 `wrong_code`; after 5 wrong tries the right code gives 400 `code_expired`.
- `GET /me needs a token`: without → 401 `unauthorized`; with → the user.

`test/cafes.test.ts`:
- `cafés are placed around the first position`: GET `/cafes?latitude=60.45&longitude=22.27` → 3 cafés, each with numeric `coordinates`, `image` starting with `http://`.
- `menu of an unknown café is 404`: GET `/cafes/nope/menu` → 404 `cafe_not_found`.
- `spot lookup`: code `shoot-spot:saari-table-4` for `saaripaahtimo` → label `Table 4, by the window`; for `kampuskuppi` → 404 `not_a_spot`.

Requests go through `app.request(path, init)`; no port is opened.

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npm test -w @shoot/server`
Expected: FAIL, cannot import `../src/app.ts`.

- [ ] **Step 4: Implement**

Port the existing routes onto Hono, each file exporting `function xRoutes(deps: Deps): Hono` mounted in `createApp`. `origin` for image URLs comes from the request's `Host` header as today. `main.ts` builds the real `Deps` (file database in `config.dataDir`, `Date.now`), serves with `@hono/node-server` on `0.0.0.0:${config.port}`, and prints the LAN addresses as today.

- [ ] **Step 5: Run the tests and see them pass**

Run: `npm run check -w @shoot/server`
Expected: types pass, 6 tests pass.

- [ ] **Step 6: Commit**

`git commit -m "refactor(server): Hono app with injected dependencies"`

### Task 2: Shared order types for the new lifecycle

**Files:**
- Modify: `packages/shared/src/types.ts`, `packages/shared/src/index.ts`, `packages/shared/tsconfig.json`, `apps/customer/tsconfig.json`, `apps/customer/src/data/order-format.ts`, `apps/customer/src/data/queries.ts`
- Create: `packages/shared/src/orders.ts`, `packages/shared/test/orders.test.ts`, `packages/shared/package.json` (`"test": "node --test test/"`)

**Interfaces:**
- Produces in `@shoot/shared`:
  - `type OrderStatus = 'received' | 'preparing' | 'on-the-way' | 'delivered' | 'declined' | 'expired' | 'cancelled'` (what customers and sellers see; `pending-payment` and `abandoned` are server-only).
  - `type DeclineReason = 'sold-out' | 'too-busy' | 'closing-soon' | 'other'`
  - `Order` gains `acceptBy: string | null`, `acceptedAt: string | null`, `declineReason: DeclineReason | null`; `readyAt` becomes `string | null` (null until accepted).
  - `ACCEPT_WINDOW_MS = 300_000`, `isLiveStatus(status: OrderStatus): boolean` (received, preparing, on-the-way), `isEndedStatus(status): boolean`, `canMove(from: string, to: string): boolean` implementing the moves in Global Constraints (including the server-only ones).
  - `index.ts` exports values now: `export * from './orders.ts'` and `export type * from './types.ts'`. The `.ts` extensions are required because the server runs this code in Node, whose ESM loader needs full file names. So `allowImportingTsExtensions: true` goes into `apps/customer/tsconfig.json` and `packages/shared/tsconfig.json` (both are already `noEmit`), and `packages/shared/package.json` gets `"type": "module"`.

- [ ] **Step 1: Failing tests** in `packages/shared/test/orders.test.ts`: `canMove('received','preparing')` true; `canMove('preparing','received')` false; `canMove('delivered','on-the-way')` false; `canMove('pending-payment','received')` true; `isLiveStatus('declined')` false; `ACCEPT_WINDOW_MS === 300000`.
- [ ] **Step 2: Run** `node --test packages/shared/test/` → FAIL (module missing).
- [ ] **Step 3: Implement** `orders.ts`; extend `types.ts`. In the customer app: `STATUS_LABEL` gets `declined: 'Declined'`, `expired: 'Not accepted'`, `cancelled: 'Cancelled'`, `received: 'Waiting for the café'`; `isLive` uses `isLiveStatus`; `readyTime` and `minutesLeft` handle `readyAt === null` (show "after the café accepts").
- [ ] **Step 4: Run** the shared tests → PASS; `npx tsc --noEmit` and `npx expo lint` in `apps/customer` → pass; an iOS bundle still exports (`npx expo export --platform ios --output-dir <scratch>`), proving Metro accepts the `.ts` extension imports in the shared package.
- [ ] **Step 5: Commit** `feat(shared): order statuses and transitions`

### Task 3: Order lifecycle

**Files:**
- Create: `server/src/domain/orders.ts`, `server/src/domain/photos.ts`, `server/test/orders.test.ts`
- Modify: `server/src/db/schema.ts` (orders: `payment_id`, `payment_method_id`, `accept_by`, `accepted_at`, `decline_reason`, `ended_at`; `ready_at` nullable; status values per Global Constraints)

**Interfaces:**
- Consumes: `Deps` (Task 1), `canMove`, `ACCEPT_WINDOW_MS` (Task 2), `Payments` (Task 4 interface; this task writes against the interface and the fake).
- Produces, all in `domain/orders.ts`, each returning the updated `OrderRow` and calling `emit(deps, order, event)` once:
  - `createOrder(deps, userId: string, input: NewOrderInput): Promise<{ order: OrderRow; clientSecret: string | null }>` — runs today's checks in today's order (open, paused → 409 `cafe_paused`, range → 422 `out_of_range`, sold out → 409 `sold_out`, spot → 422 `not_a_spot`, photos), then `payments.reserve`, stores `pending-payment`.
  - `confirmPayment(deps, userId, orderId)` → `received`, `accept_by = now + ACCEPT_WINDOW_MS`; 402 `payment_declined` if `payments.isReserved` is false.
  - `acceptOrder(deps, cafeId, orderId)` → `preparing`, `accepted_at`, `ready_at`; calls `payments.capture` first; capture failure → 402 `payment_failed`, order unchanged; past `accept_by` → expires it and answers 409 `expired`.
  - `declineOrder(deps, cafeId, orderId, reason: DeclineReason)`, `cancelOrder(deps, userId, orderId)` (only from `received`), `startDelivery(deps, cafeId, orderId)`, `markDelivered(deps, cafeId, orderId)`.
  - `expireOverdue(deps): number` (expired count) and `abandonUnpaid(deps): number`.
  - `type OrderEvent = 'created' | 'received' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'on-the-way' | 'delivered' | 'abandoned'`; `emit` calls `deps.hub.orderChanged(order)` and `deps.push.orderChanged(order, event)`.
- Every status write is one `UPDATE … WHERE id = ? AND status = ?` and checks `changes === 1`; zero changes → 409 `status_conflict`. This is what makes a double tap safe.

- [ ] **Step 1: Failing tests** (`test/orders.test.ts`, using `createTestApp` and the domain functions directly):
  - `paying reserves and confirming makes it received with a 5-minute deadline` (`accept_by` = now + 300000).
  - `accept captures once and sets readyAt from accept time` (fake payments records one capture; `ready_at` = accept time + 10 min for Saaripaahtimo).
  - `second accept is a 409 and captures nothing more`.
  - `accept after the deadline expires the order and releases the money` (advance clock 300001 ms; expect 409 `expired`, status `expired`, one release).
  - `capture failure leaves the order received` (fake payments set to fail capture → 402 `payment_failed`, status `received`).
  - `decline releases and stores the reason`; `customer can cancel only while received`.
  - `expireOverdue expires only orders past their deadline`; `abandonUnpaid releases pending orders older than 30 minutes`.
  - `delivered order deletes its photos` (upload two files into the temp dir, deliver, both gone).
  - `on-the-way needs preparing first` (409 `status_conflict`).
- [ ] **Step 2: Run** `npm test -w @shoot/server` → the new tests FAIL.
- [ ] **Step 3: Implement** the functions; `photos.ts` has `deletePhotos(deps, delivery)` that removes `/uploads/…` files and ignores missing ones.
- [ ] **Step 4: Run** `npm run check -w @shoot/server` → all pass.
- [ ] **Step 5: Commit** `feat(server): order lifecycle with accept window`

### Task 4: Payments, fake and Stripe

**Files:**
- Create: `server/src/payments/types.ts`, `server/src/payments/fake.ts`, `server/src/payments/stripe.ts`, `server/test/payments.test.ts`
- Modify: `server/src/main.ts`, `server/src/config.ts`

**Interfaces:**
- Produces: `interface Payments { reserve(amountCents: number, methodId: string): Promise<{ paymentId: string; clientSecret: string | null }>; isReserved(paymentId: string): Promise<boolean>; capture(paymentId: string): Promise<void>; release(paymentId: string): Promise<void> }`.
  - `createFakePayments(): Payments & { captures: string[]; releases: string[]; failNextCapture(): void }` — `isReserved` is false for `card-0002`.
  - `createStripePayments(secretKey: string): Payments` — `paymentIntents.create({ amount, currency: 'eur', capture_method: 'manual', automatic_payment_methods: { enabled: true } })`; `isReserved` = `retrieve(id).status === 'requires_capture'`; `capture`; `release` = `cancel`.
  - `config.stripeSecretKey: string | undefined`; `main.ts` picks Stripe when set and logs which one it uses.

- [ ] **Step 1: Install** `npm install stripe@^23.1.0 -w @shoot/server`.
- [ ] **Step 2: Failing tests** for the fake: `card-0002 is never reserved`; `capture and release are recorded`; `failNextCapture makes one capture throw`. The Stripe adapter gets no automated test (it needs network and keys); it's checked by hand in Task 9.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** `npm run check -w @shoot/server` → PASS.
- [ ] **Step 6: Commit** `feat(server): payments interface with fake and Stripe`

### Task 5: Seller accounts

**Files:**
- Create: `server/src/auth/passwords.ts`, `server/src/auth/sessions.ts`, `server/src/routes/seller-auth.ts`, `server/scripts/create-seller.ts`, `server/test/seller-auth.test.ts`
- Modify: `server/src/db/schema.ts` (`staff(id, cafe_id, email UNIQUE, name, password_hash, created_at)`; `sessions` gains nullable `staff_id`, and exactly one of `user_id`/`staff_id` is set), `server/src/db/seed.ts`, `server/src/routes/auth.ts`, `server/package.json`

**Interfaces:**
- Produces:
  - `hashPassword(password: string): Promise<string>` and `verifyPassword(password, stored): Promise<boolean>` with `node:crypto` scrypt, random 16-byte salt, stored as `scrypt$<salt hex>$<hash hex>`.
  - `requireUser(c): User` and `requireSeller(c): { staffId: string; cafeId: string; name: string }`; a customer token on a seller route → 401, and the other way round.
  - Routes: `POST /seller/auth/sign-in { email, password }` → `{ token, seller: { id, name, email, cafe } }`, wrong email or password → 401 `wrong_credentials` (same answer for both); `POST /seller/auth/sign-out`; `GET /seller/me`.
  - Seed: one seller per café, `<café id>@shoot.test`, password `shoot-demo` (development only, printed at start).
  - `npm run create-seller -w @shoot/server -- --cafe <id> --email <e> --name <n> --password <p>`.
- [ ] **Step 1: Failing tests**: `seller signs in with the seeded account`; `wrong password and unknown email give the same 401`; `customer token is rejected on /seller/me`; `seller token is rejected on /me`; `stored hash is not the password`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check -w @shoot/server` → PASS.
- [ ] **Step 5: Commit** `feat(server): seller accounts and sign-in`

### Task 6: Order routes for customers and sellers

**Files:**
- Create: `server/src/routes/orders.ts`, `server/src/routes/seller-orders.ts`, `server/src/routes/seller-cafe.ts`, `server/test/order-routes.test.ts`

**Interfaces:**
- Consumes: domain functions (Task 3), `requireUser`/`requireSeller` (Task 5).
- Produces (all JSON, errors as `{ error, message, ...details }`):
  - Customer: `POST /orders` → 201 `{ order, payment: { clientSecret: string | null } }`; `POST /orders/:id/confirm` → order; `POST /orders/:id/cancel` → order; `GET /orders` (never `pending-payment` or `abandoned`); `GET /orders/:id`.
  - Seller: `GET /seller/orders` (own café: live ones oldest first, then the last 20 ended); `POST /seller/orders/:id/accept`, `/decline { reason }`, `/on-my-way`, `/delivered`; `PATCH /seller/menu-items/:id { soldOut?, priceCents?, description? }` (own café only); `PATCH /seller/cafe { isPaused? }`.
  - Another café's order or item → 404 `order_not_found` / `item_not_found`.
- [ ] **Step 1: Failing tests**: the full happy path (customer creates, confirms, seller accepts, on-my-way, delivered; customer sees each status); `seller of another café gets 404`; `customer list hides unpaid orders`; `paused café refuses new orders with 409 cafe_paused`; `seller marks an item sold out and a new order with it gets 409 sold_out`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check -w @shoot/server` → PASS.
- [ ] **Step 5: Commit** `feat(server): order routes for customers and sellers`

### Task 7: Live updates over WebSocket

**Files:**
- Create: `server/src/realtime/hub.ts`, `server/test/realtime.test.ts`
- Modify: `server/src/app.ts`, `server/src/main.ts`

**Interfaces:**
- Produces:
  - `interface Hub { orderChanged(order: OrderRow): void }` and `createHub(): Hub & { attach(socket: { send(text: string): void }, who: { userId: string } | { cafeId: string }): () => void }` (returns detach).
  - Route `GET /ws?token=<token>` upgrades with `@hono/node-ws`; unknown token → close with code 4401. The token is in the query because React Native's WebSocket can't set headers on iOS reliably.
  - Message: `{ "type": "order.updated", "order": <same shape as GET /orders/:id> }` sent to the order's customer and to every seller of its café.
  - `main.ts` calls `injectWebSocket(server)`.
- [ ] **Step 1: Failing tests** (start the app on port 0 with `@hono/node-server`, connect with Node's global `WebSocket`): `customer receives their order's updates`; `another customer receives nothing` (wait 200 ms after the update); `seller of the café receives it`; `bad token is closed with 4401`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check -w @shoot/server` → PASS.
- [ ] **Step 5: Commit** `feat(server): live order updates over WebSocket`

### Task 8: Push notifications

**Files:**
- Create: `server/src/push/types.ts`, `server/src/push/expo.ts`, `server/src/push/fake.ts`, `server/src/push/messages.ts`, `server/test/push.test.ts`
- Modify: `server/src/db/schema.ts` (`push_tokens(token PRIMARY KEY, user_id, staff_id, created_at)`), `server/src/routes/auth.ts`, `server/src/routes/seller-auth.ts`, `server/src/main.ts`

**Interfaces:**
- Produces:
  - `interface Push { orderChanged(order: OrderRow, event: OrderEvent): void }` — fire and forget; a push failure is logged, never thrown.
  - `messageFor(order, event): { to: 'customer' | 'seller'; title: string; body: string } | null` in `messages.ts`. Seller: `received` → "New order #2044", body "2 items · accept within 5 minutes", with sound. Customer: `accepted` → "Saaripaahtimo accepted your order"; `on-the-way` → "Your order is on its way"; `delivered` → "Delivered. Enjoy!"; `declined` → "Saaripaahtimo couldn't take your order" with the reason; `expired` → "Your order wasn't accepted". Body of the last two: "You haven't been charged." Other events → null.
  - Routes: `POST /me/push-token { token }` and `POST /seller/push-token { token }`; non-Expo tokens → 400 `invalid_field`.
  - `createExpoPush(db)` uses `expo-server-sdk`; `createFakePush(): Push & { sent: { token: string; title: string; body: string }[] }`.
- [ ] **Step 1: Install** `npm install expo-server-sdk@^8.0.0 -w @shoot/server`.
- [ ] **Step 2: Failing tests**: `new paid order notifies the café's sellers`; `accept notifies the customer`; `created and abandoned notify nobody`; `bad token is rejected`.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** `npm run check -w @shoot/server` → PASS.
- [ ] **Step 6: Commit** `feat(server): push notifications`

### Task 9: Timer, docs, and the customer app on the new API

**Files:**
- Modify: `server/src/main.ts` (every 15 s: `expireOverdue`, `abandonUnpaid`), `server/README.md` (API rewritten for this plan's routes and errors), `server/src/db/seed.ts` comment, `apps/customer/src/data/api.ts`, `apps/customer/src/data/use-place-order.ts`, `apps/customer/src/app/(tabs)/orders.tsx`, `apps/customer/src/app/order-sent/[id].tsx`, `apps/customer/src/components/order-card.tsx`

**Interfaces:**
- Consumes: customer routes (Task 6).
- Produces: `placeOrder(input)` in the app now calls `POST /orders`, then `POST /orders/:id/confirm` (the Stripe sheet goes between them in step 4; with fake payments `clientSecret` is null and nothing is shown). Errors map as today, plus `cafe_paused` → a new `CafePausedError` shown by the existing generic failure sheet text "The café isn't taking orders right now."

- [ ] **Step 1: Failing check**: with the server from Task 8 running on fake payments, `npx tsc --noEmit` in `apps/customer` fails after changing `placeOrder` to expect `{ order, payment }` until the call sites are updated.
- [ ] **Step 2: Implement** the app changes; Orders and order-sent show "Waiting for the café to accept" for `received`, and ended orders (declined, expired, cancelled) appear under "Earlier" with their label. Full end-state screens are step 4.
- [ ] **Step 3: Verify**: `npm run check` at the root passes. Then by hand, with two terminals: start the server (`npm run reset -w @shoot/server && npm run dev -w @shoot/server`), and run this script against it, which plays both sides with curl:
  - customer signs in, creates and confirms an order → status `received`
  - seller `saaripaahtimo@shoot.test` / `shoot-demo` signs in, accepts → `preparing`, on-my-way → `on-the-way`, delivered → `delivered`
  - a second order left alone for 5 minutes ends `expired`
  Save it as `server/scripts/smoke.sh` and run it. Expected: each step prints the expected status.
- [ ] **Step 4: Stripe by hand (if keys exist)**: with `STRIPE_SECRET_KEY=sk_test_…`, create an order; the response has a `clientSecret` starting with `pi_`. Confirming without paying gives 402 `payment_declined`. (Paying with the sheet is step 4.)
- [ ] **Step 5: Commit** `feat: customer app on the order lifecycle API; timer; API docs`
