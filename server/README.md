# Shoot test server

A small backend for testing the app until the real one is ready. It's plain Node with no packages: Node 24+ runs the TypeScript files directly, and has SQLite built in.

## Run it

```bash
cd server
npm run dev        # restarts when you save a file
```

The terminal prints the address your phone can use, and every request. The app finds the server by itself when it runs on the same computer as `npx expo start`. To use another server (for example your friend's), put `EXPO_PUBLIC_API_URL=http://…` in `.env.local` in the app folder and restart Expo.

| Setting | Default | What it does |
|---|---|---|
| `PORT` | `4000` | The port. |
| `DATA_DIR` | `./data` | The database file and uploaded photos. `npm run reset` deletes it. |
| `SMS_CODE` | `123456` | The code every number gets. Set it to an empty value for random codes, printed in the terminal. |
| `STAFF_KEY` | `dev-staff-key` | The password for the staff routes. |
| `AUTO_ADVANCE` | `true` | Moves orders along by the clock, because there's no café app yet. |
| `NODE_ENV` | | `production` turns off the `/dev` routes. |

`npm run types:check` checks the types. The app's own `tsc` and lint skip this folder.

## Test data

The first time the app asks for cafés, the three test cafés are placed around that position (45 m, 80 m and 350 m away) and saved. To move them, delete the data (`npm run reset`) or call `POST /dev/anchor`. Spot sticker codes: `shoot-spot:saari-table-4`, `shoot-spot:saari-bench-fountain`, `shoot-spot:kampus-table-12`.

## API

JSON in, JSON out. Prices are in cents, times are ISO strings, positions are `{ "latitude", "longitude" }`. Image fields are full URLs.

Signed-in routes need `Authorization: Bearer <token>`. Staff routes need `X-Staff-Key: <key>`.

An error has a status code and a body like this. The app uses `error`, people read `message`, and some errors add fields:

```json
{ "error": "out_of_range", "message": "Saaripaahtimo delivers within 100 m.", "distanceM": 140, "radiusM": 100 }
```

### Sign-in

| Request | Answer |
|---|---|
| `POST /auth/code` `{ phone }` | 204. Texts a code (here: prints it). `phone` is like `+358401234567`. |
| `POST /auth/verify` `{ phone, code }` | `{ token, user }`. Creates the account the first time. Errors: `wrong_code`, `code_expired` (also after 5 wrong tries). |
| `POST /auth/sign-out` 🔒 | 204. The token stops working. |
| `GET /me` 🔒 | `{ id, phone, createdAt }` |
| `POST /me/phone` 🔒 `{ phone, code }` | The user with the new number. Send `/auth/code` to the new number first. Error: `phone_taken`. |
| `DELETE /me` 🔒 | 204. Deletes the account. Its orders stay, without the user. |

🔒 = needs the token.

### Cafés

| Request | Answer |
|---|---|
| `GET /cafes?latitude=&longitude=` | Cafés: `id, name, image, coverImage, coordinates, radiusM, openUntil, isOpen, readyInMin, deliveryFeeCents, categories` |
| `GET /cafes/:id` | One café. |
| `GET /cafes/:id/menu` | Menu items: `id, cafeId, name, description, priceCents, image?, section, soldOut` |
| `GET /menu-items?cafeIds=a,b` | Items of several cafés, for search. |
| `GET /cafes/:id/spot?code=` | The spot `{ id, cafeId, label, code }`, or 404 `not_a_spot`. |

### Photos

`POST /uploads` 🔒 with the photo's bytes as the body and `Content-Type: image/jpeg` (or `image/png`). Answers 201 `{ url, path }`. Put `path` in the order.

### Orders

`POST /orders` 🔒 checks everything, charges, and stores the order. It answers 201 with the order.

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

`delivery` can also be `{ "kind": "spot", "spotCode": "shoot-spot:saari-table-4" }`. The app sends only ids and quantities; the server takes names and prices from the menu.

The checks run in this order, and nothing is charged if one fails:

| Error | Status | When |
|---|---|---|
| `cafe_closed` | 409 | The café switched itself off. |
| `out_of_range` | 422 | `coordinates` are farther than the café's `radiusM`. Adds `distanceM`, `radiusM`. |
| `sold_out` | 409 | An item is sold out or not on the menu. Adds `itemIds`. |
| `not_a_spot` | 422 | The spot code isn't this café's. |
| `payment_declined` | 402 | The card said no. Test card: `methodId` `card-0002`. |

An order: `id, number, cafeId, cafeName, cafeImage, lines, note, subtotalCents, deliveryFeeCents, totalCents, delivery, paymentLabel, status, createdAt, readyAt, updatedAt`. `status` is `received`, `preparing`, `on-the-way` or `delivered`, and only moves forward.

| Request | Answer |
|---|---|
| `GET /orders` 🔒 | Your orders, newest first. |
| `GET /orders/:id` 🔒 | One of your orders. Someone else's gives 404. |

### Staff (for the café dashboard and the courier)

| Request | Answer |
|---|---|
| `GET /staff/cafes/:id/orders?active=true` | The café's orders, oldest first. `active` leaves out delivered ones. |
| `PATCH /staff/orders/:id` `{ status }` | The order. Only forward, else 409 `status_backwards`. Stops the clock for this order. |
| `PATCH /staff/cafes/:id` `{ isOpen?, readyInMin?, openUntil? }` | The café. |
| `PATCH /staff/menu-items/:id` `{ soldOut?, priceCents? }` | The item. |

### Development only

| Request | What it does |
|---|---|
| `POST /dev/anchor` `{ coordinates }` | Places the test cafés around a new position. |
| `POST /dev/sell-out` `{ itemId }` | Marks an item as sold out (E6). |

## Not built yet

- Real-time updates. The app asks every 30 s. Next step: a WebSocket or server-sent events, so the courier's position can stream.
- Real SMS (an SMS service like Twilio) and real payments (Stripe).
- Staff accounts per café. Now one shared key opens every café.
- Photo privacy. Photo URLs are random and can't be guessed, but anyone with the URL can open one, and photos aren't deleted after delivery yet.
- HTTPS. Phones allow plain HTTP to a computer on the same Wi-Fi during development only.
