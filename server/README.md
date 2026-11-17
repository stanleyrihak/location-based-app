# Shoot server

The backend for the customer app and the seller app: accounts, cafés and menus, orders with payment, live updates and push notifications. Node with Hono and SQLite. Node 24+ runs the TypeScript files directly, so there's no build step.

## Run it

```bash
npm run dev -w @shoot/server     # from the repo root; restarts when you save a file
npm run reset -w @shoot/server   # deletes the database and photos (needed after a table changes)
npm run check -w @shoot/server   # types and tests
```

The terminal prints the address your phone can use, the development SMS code, the seller sign-in, whether payments are real, and every request.

### Settings

Put them in `server/.env.local` (git ignores it) or on the command line.

| Setting | Default | What it does |
|---|---|---|
| `PORT` | `4000` | The port. |
| `DATA_DIR` | `server/data` | The database file and uploaded photos. |
| `SMS_CODE` | `123456` | The code every number gets. Empty gives random codes, printed in the terminal. |
| `STRIPE_SECRET_KEY` | | A Stripe test key (`sk_test_…`). Without it, payments are fake and card `card-0002` declines. |
| `NODE_ENV` | | `production` turns off the `/dev` routes and SVG uploads. |

### Accounts for testing

- **Customer.** Any phone number, code `123456`.
- **Seller.** `<café id>@shoot.test`, password `shoot-demo`, for example `saaripaahtimo@shoot.test`.
- **More sellers.** `npm run create-seller -w @shoot/server -- --cafe saaripaahtimo --email anna@example.com --name Anna --password 'a long password'`

### Test data

The first time anyone asks for cafés, the three test cafés are placed around that position (45 m, 80 m and 350 m away). Spot sticker codes: `shoot-spot:saari-table-4`, `shoot-spot:saari-bench-fountain`, `shoot-spot:kampus-table-12`.

`bash server/scripts/smoke.sh` plays an order through from both sides against a running server. Add `--with-expiry` to also wait for one to expire.

## How the code is laid out

- `src/app.ts` builds the API from `Deps` (database, payments, push, live connections, clock). `src/main.ts` passes the real ones; tests pass fakes and run without a network.
- `src/domain/orders.ts` has every order rule. Routes only check who is asking and call it.
- `src/routes/` has one file per area. `src/payments/`, `src/push/` and `src/realtime/` have the side effects.
- `test/` runs with Node's built-in test runner.

## API

JSON in, JSON out. Prices are in cents, times are ISO strings, positions are `{ "latitude", "longitude" }`, and image fields are full URLs.

Customer routes need `Authorization: Bearer <token>` from customer sign-in, and seller routes the token from seller sign-in. A customer token doesn't work on seller routes, or the other way round.

An error has a status code and a body like this. The apps use `error`, people read `message`, and some errors add fields:

```json
{ "error": "out_of_range", "message": "Saaripaahtimo delivers within 100 m.", "distanceM": 140, "radiusM": 100 }
```

### Customer sign-in

| Request | Answer |
|---|---|
| `POST /auth/code` `{ phone }` | 204. Texts a code (here: always `123456`). `phone` like `+358401234567`. |
| `POST /auth/verify` `{ phone, code }` | `{ token, user }`. Creates the account the first time. Errors: `wrong_code`, `code_expired` (also after 5 wrong tries). |
| `POST /auth/sign-out` | 204. Also stops push notifications to this person. |
| `GET /me` | `{ id, phone, createdAt }` |
| `POST /me/phone` `{ phone, code }` | The user with the new number. Send `/auth/code` to the new number first. Error: `phone_taken`. |
| `DELETE /me` | 204. Deletes the account. Its orders stay, without the user. |
| `POST /me/push-token` `{ token }` | 204. The phone's Expo push token. |

### Cafés (no sign-in needed)

| Request | Answer |
|---|---|
| `GET /config` | `{ payments: 'stripe' \| 'fake', stripePublishableKey }`. No sign-in. The key comes from `STRIPE_PUBLISHABLE_KEY`; null without Stripe or when it's missing. |
| `GET /cafes?latitude=&longitude=` | Cafés: `id, name, image, coverImage, coordinates, radiusM, openUntil, isOpen, isPaused, readyInMin, deliveryFeeCents, categories, phone` |
| `GET /cafes/:id` | One café. |
| `GET /cafes/:id/menu` | Items: `id, cafeId, name, description, priceCents, image?, section, soldOut` |
| `GET /menu-items?cafeIds=a,b` | Items of several cafés, for search. |
| `GET /cafes/:id/spot?code=` | `{ id, cafeId, label, code }`, or 404 `not_a_spot`. |

### Photos

`POST /uploads` with the photo's bytes as the body and `Content-Type: image/jpeg` (or `image/png`). Answers 201 `{ url, path }`. Put `path` in the order. Photos are deleted when the order ends.

### Orders: the customer

Placing an order takes two calls, because the customer pays in between:

1. `POST /orders` checks the order and reserves the money. It answers 201 `{ order, payment: { clientSecret } }`, with the order in status `pending-payment`.
2. The app shows Stripe's payment sheet with `clientSecret`. With fake payments it's `null` and there's no sheet.
3. `POST /orders/:id/confirm` checks that the money is held and sends the order to the café. The order becomes `received`, with `acceptBy` five minutes ahead.

```json
{
  "cafeId": "saaripaahtimo",
  "lines": [{ "itemId": "saari-cappuccino", "quantity": 2 }],
  "note": "No sugar",
  "coordinates": { "latitude": 60.45, "longitude": 22.27 },
  "delivery": { "kind": "photos", "selfie": "/uploads/….jpg", "spot": "/uploads/….jpg" },
  "payment": { "methodId": "wallet", "label": "Apple Pay" }
}
```

`delivery` can also be `{ "kind": "spot", "spotCode": "shoot-spot:saari-table-4" }`. The app sends ids and quantities only; names and prices come from the menu.

`POST /orders` checks in this order, before reserving anything:

| Error | Status | When |
|---|---|---|
| `cafe_closed` | 409 | The café is closed. |
| `cafe_paused` | 409 | The seller paused orders. |
| `price_changed` | 409 | `expectedTotalCents` (optional in `POST /orders`) isn't the total at today's prices. Has `totalCents`. |
| `out_of_range` | 422 | `coordinates` are farther than `radiusM`. Adds `distanceM`, `radiusM`. |
| `sold_out` | 409 | An item is sold out or not on the menu. Adds `itemIds`. |
| `not_a_spot` | 422 | The spot code isn't this café's. |

`POST /orders/:id/confirm` answers 402 `payment_declined` if the money isn't held (fake: card `card-0002`).

| Request | Answer |
|---|---|
| `POST /orders/:id/cancel` | The order, `cancelled`. Only while `received`; the money is released. |
| `GET /orders` | Your orders, newest first. Unpaid ones are left out. |
| `GET /orders/:id` | One of your orders. Someone else's gives 404. |

An order: `id, number, cafeId, cafeName, cafeImage, lines, note, subtotalCents, deliveryFeeCents, totalCents, delivery, deliverTo, cafePhone, customerPhone, paymentLabel, status, createdAt, acceptBy, acceptedAt, readyAt, declineReason, updatedAt`.

`deliverTo` is the delivery spot: the coordinates the customer paid from, for every kind of delivery. `cafePhone` and `customerPhone` are copied when the order is placed, for the Call buttons.

### Order statuses

```
pending-payment ──confirm──► received ──accept──► preparing ──on-my-way──► on-the-way ──delivered──► delivered
       │                        ├─ decline ──► declined
       └─ 30 min unpaid ──►     ├─ 5 min, no answer ──► expired
          abandoned             └─ customer cancels ──► cancelled
```

- Statuses only move forward. Anything else answers 409 `status_conflict`.
- The money is taken at accept. Declined, expired, cancelled and abandoned orders release it.
- `readyAt` is set at accept: accept time plus the café's `readyInMin`.
- The server checks every 15 seconds for orders to expire or abandon. An accept after the 5 minutes answers 409 `expired`, even between two checks.

### Orders: the seller

| Request | Answer |
|---|---|
| `POST /seller/auth/sign-in` `{ email, password }` | `{ token, seller: { id, name, email, cafe } }`. Wrong email or password: 401 `wrong_credentials`. |
| `POST /seller/auth/sign-out` | 204. Also stops push notifications to this seller. |
| `GET /seller/me` | The seller with their café. |
| `POST /seller/push-token` `{ token }` | 204. |
| `GET /seller/orders` | The café's live orders, oldest first, then the last 20 finished ones. |
| `POST /seller/orders/:id/accept` | `preparing`. Errors: 409 `expired`, 409 `status_conflict`, 402 `payment_failed` (the money couldn't be taken; the order stays `received`). |
| `POST /seller/orders/:id/decline` `{ reason }` | `declined`. `reason`: `sold-out`, `too-busy`, `closing-soon`, `other`. |
| `POST /seller/orders/:id/on-my-way` | `on-the-way`. |
| `POST /seller/orders/:id/delivered` | `delivered`. |
| `PATCH /seller/cafe` `{ isPaused?, coordinates? }` | The café. `coordinates` is "Sell from here": the new selling point. 409 `cafe_busy` while an order is received, preparing or on the way. |
| `GET /seller/menu` | Every item of the café, in menu order, sold-out ones too. |
| `PATCH /seller/menu-items/:id` `{ soldOut?, priceCents?, description? }` | The item. Another café's item gives 404. |

Another café's order gives 404 `order_not_found`.

### Live updates

Open a WebSocket to `/ws?token=<token>` with a customer or seller token. The token is in the address because React Native can't reliably send headers with a WebSocket on iOS. A bad token closes the socket with code 4401.

Each change to an order arrives as:

```json
{ "type": "order.updated", "order": { …the same as GET /orders/:id… } }
```

A customer gets their own orders, and a seller gets their café's paid orders. Nobody gets anything else. Every 20 s each connection also gets `{ type: 'ping' }`; an app that hears nothing for 45 s reconnects.

### Moved to a different seat (E10)

`POST /orders/:id/spot` `{ coordinates, delivery }` → the updated order. `delivery` is `{ "kind": "spot", "spotCode": "…" }` or `{ "kind": "photo", "spot": "/uploads/….jpg" }` (a new spot photo; the selfie stays). Only while the order is live. `deliverTo` becomes the new coordinates, the café gets `order.updated`, and a replaced photo is deleted.

Errors: 404 `order_not_found`, 409 `status_conflict` (the order ended), 422 `out_of_range` `{ distanceM, radiusM }`, 422 `not_a_spot`, 422 `needs_selfie` (a photo for an order placed with a spot code).

### Positions during the walk

Only while an order is `on-the-way`. The server keeps the latest position per side in memory and never writes it to the database. "Delivered" forgets it.

| Request | Answer |
|---|---|
| `POST /seller/orders/:id/position` `{ latitude, longitude }` | 204. The customer gets `{ type: 'seller.position', orderId, position: { latitude, longitude, at } }`. |
| `POST /orders/:id/position` `{ latitude, longitude }` | 204. The café's sellers get `{ type: 'customer.position', … }`. |
| `GET /orders/:id/track`, `GET /seller/orders/:id/track` | `{ seller, customer }`: the latest positions, or null. Both null unless on the way. |

Errors: 404 `order_not_found` for an order that isn't yours, 409 `status_conflict` when it isn't on the way, 400 for bad coordinates. Positions go in over HTTP, not the WebSocket, because the seller's phone sends them from a background task while the app's live connection is closed.

### Push notifications

Through Expo's push service, to the tokens registered above:

| When | Who | Title |
|---|---|---|
| Order paid | the café's sellers | New order #2044 (with sound) |
| Accepted | customer | Saaripaahtimo accepted your order |
| On the way | customer | Your order is on its way |
| Delivered | customer | Delivered. Enjoy! |
| Declined | customer | Saaripaahtimo couldn't take your order |
| Expired | customer | Your order wasn't accepted |

Every push has `data: { orderId }`, so a tap opens that order. Pushes to sellers use the Android channel `orders` (loud, on the lock screen), which the seller app creates.

### Development only

| Request | What it does |
|---|---|
| `POST /dev/anchor` `{ coordinates }` | Places the test cafés around a new position. |
| `POST /dev/sell-out` `{ itemId }` | Marks an item as sold out (E6). |

## Not built yet

- Real SMS (an SMS service) and real money (Stripe live mode).
- Photo privacy beyond random names: anyone with a photo's URL can open it until the order ends.
- HTTPS. Phones allow plain HTTP to a computer on the same Wi-Fi during development only.
