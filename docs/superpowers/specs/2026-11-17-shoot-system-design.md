# Shoot system design: server, seller app and delivery tracking

Date: 2026-11-17. Status: approved by the owner on 2026-11-17.

## Intent

Shoot lets someone sitting near a café order a coffee from their seat and have it brought to them. The customer app (ordering flow, phases 1 to 5) exists. This design adds the rest of the system so the whole loop works on real phones: a real server, an app for the café, and live tracking of the delivery.

It is a school project. On demo day we show one order from start to finish: a customer orders on one phone, the café sees it on the other phone, accepts it, makes it, walks it over while the customer watches on a map, and hands it over.

The owner (Stanislav) uses the project to learn React Native and Expo. Code should be readable, with comments that explain why, in the style of the existing app.

## Goals

- A customer orders and pays (Stripe test mode). The café accepts within 5 minutes, or the order cancels itself and nobody is charged.
- The café sees each order with the customer's photos or spot code, the customer's position on a map, and its own position.
- The customer sees the seller walking over on a map, and gets a push notification at each step where the phone allows it.
- Either side can call the other.
- The seller can move their stand, pause orders, mark items sold out and change prices and descriptions.
- Everything runs from the owner's laptop, with an iPhone and an Android phone on the same Wi-Fi.

## Non-goals (for the demo)

- Group orders (G1 to G3).
- Chat between café and customer (4.3). A call button replaces it.
- A web version of the café app.
- Café sign-up. Café accounts are created with a script.
- Adding or removing menu items, or menu photos, from the app. The script loads the starting menu.
- Several orders in one delivery walk.
- E8 (left the area while preparing), E9 (courier can't find you, with its timer), 4.5 (pick up at the counter).
- Real SMS, real money, hosting outside the laptop, refunds after an order was accepted.

## Anti-goals

- Charging a customer for an order the café never accepted.
- Sharing anyone's position when it isn't needed: the seller only between "On my way" and "Delivered", the customer only while their app is open and an order is live.
- Keeping customer photos after the order ends.
- A demo that depends on a flaky step: if push or the live connection fails, the apps still catch up by polling.

## Constraints

- Expo SDK 58, React Native 0.88, Expo Router, React Query. Node 26 on the laptop.
- Devices: one iPhone (customer) and one Android phone (seller). No paid Apple Developer account. This means:
  - The iPhone gets no push notifications. It shows every change live while the app is open.
  - The iPhone can't use Apple Pay. It pays with Stripe test cards.
  - iPhone builds come from the owner's Mac with a free Apple ID and stop opening after 7 days.
- Stripe, push notifications, background location and native maps don't work in Expo Go. Both apps run as development builds.
- The laptop serves plain HTTP on the local Wi-Fi. That works for development builds on both platforms.
- The working agreement in `CLAUDE.md` still applies: the owner runs package installs and wants to know why and how to check each change. Exception agreed on 2026-11-17: Claude may do all git actions (branches, moves, commits).

## Approaches considered

How the projects are laid out was the main choice.

1. Three separate repos (server, customer app, seller app). Simple, but the seller app would copy the theme, components, types and API functions, and every fix would be made twice.
2. **One repo with separate packages (chosen).** `apps/customer`, `apps/seller`, `server`, `packages/shared`. The server stays its own project with its own `package.json` that starts on its own. Shared types mean a changed field breaks the build at once. Cost: moving the existing app once, and Expo monorepo setup.
3. One app with a customer mode and a seller mode. Least code, but customers would install seller screens and background location, and sign-in would differ by role.

The owner picked 2.

Other choices, made by Claude and accepted by the owner:

- Server: Node and TypeScript, a small framework (Hono), SQLite, the Stripe library, Expo's push service.
- Live updates over WebSocket. React Native has WebSocket built in. Server-sent events would need a library.
- A real map: Apple Maps on iPhone, Google Maps on Android, in a library chosen during planning. The owner accepts adding a card to Google Cloud for the Android Maps key, as long as the demo costs nothing (mobile map loads are free).

## Repository and git

The existing repo becomes the monorepo. There is no new repo.

```
software-project/
├─ Location_Based_Delivery_App_Design/   design files, outside git
└─ shoot/                                renamed from location-based-app
   ├─ .git/                              the only one; same history and GitHub remote
   ├─ package.json                       npm workspaces
   ├─ apps/customer/                     today's app, moved with git mv
   ├─ apps/seller/                       new
   ├─ server/                            new, standalone (own package.json, `npm run dev`)
   ├─ packages/shared/                   types, API client, theme, shared components
   └─ docs/
```

- Claude commits the open work on `feature/ordering-flow`, then does the move on its own branch.
- `git mv` keeps file history (`git log --follow`).
- The owner renames the GitHub repo to `shoot` in its settings; GitHub redirects the old address.
- The test server now at `location-based-app/server/` is the starting point for `server/`. Its API description (`server/README.md`) becomes the API document and is updated as the API changes.
- The design folder stays outside the repo.

## The people and their devices

- **Customer.** Signs in with a phone number and an SMS code. Development: the code is always `123456` and printed by the server. No account otherwise.
- **Seller.** One person who runs a café or coffee stand, makes the drinks and delivers them. Uses the seller app on one phone. Signs in with email and password. A script on the server creates the café, the seller's account and the starting menu.

## Order lifecycle

```
customer pays (money reserved)
        │
   received ── seller declines ──► declined   (reservation released)
        │  └── 5 min, no answer ─► expired    (reservation released)
        │  └── customer cancels ─► cancelled  (reservation released)
     accept (money taken)
        │
    preparing
        │  "On my way" (seller starts sharing position)
    on-the-way
        │  "Delivered" (sharing stops, photos deleted)
    delivered
```

- `received` is shown to the customer as "Waiting for the café to accept".
- Accepting starts the ready-time estimate. It doesn't start at payment.
- A decline has a reason chosen from a short list ("Sold out", "Too busy", "Closing soon") plus "Other".
- When an order ends as declined, expired or cancelled, its photos are deleted too.
- Statuses only move forward. The server rejects anything else.
- The clock-driven status changes from the test server are removed. Only the seller and the 5-minute timer change statuses.

## Payments (Stripe test mode)

- The server creates a Stripe PaymentIntent with manual capture, so paying only reserves the money.
- The customer app shows Stripe's payment sheet (card, and Google Pay on Android). After the sheet succeeds, the app tells the server, and the server checks with Stripe that the money is reserved before it marks the order `received`. No Stripe webhooks are needed, so nothing from the internet has to reach the laptop.
- Accept: capture. Decline, expire or cancel: cancel the PaymentIntent.
- Prices always come from the server's menu. The app sends item ids and quantities only.
- The order is checked before any money is reserved: café open and not paused, customer in range of the selling point, items not sold out, spot code valid.

## Real-time updates

- One WebSocket per signed-in app. The server sends `order.updated` with the whole order, and position messages (`seller.position`, `customer.position`) for a live order.
- A customer receives only their own orders. A seller receives only their café's orders.
- Both apps write incoming orders into the React Query cache. Polling stays as a fallback: every 30 s while an order is live, and on reconnect.
- Positions are sent over the same connection, at most every few seconds.

## Push notifications

- Expo's push service. Each app registers its push token with the server after sign-in.
- Seller: "New order #2044" with a sound. The seller's phone is Android, so this works without a paid Apple account.
- Customer: "Accepted", "On the way", "Delivered", "Declined", "Expired". These reach Android phones. On the demo iPhone they don't arrive, and the open app shows the change live.

## Location

- **Selling point.** The café's permanent spot, which the delivery range is measured from. The seller sets it with "Sell from here" (the phone's position, with a pin to adjust). Locked while the café has orders that aren't finished.
- **Seller position.** Shared from "On my way" to "Delivered", also with the screen locked (background location on Android). It stops at "Delivered".
- **Customer delivery spot.** The confirmed place the seller walks to: the position when paying, with the two photos or a spot code.
- **Customer live position.** Sent only while the customer app is open and the order is `on-the-way`. The seller sees it as a separate dot. It never moves the delivery spot.
- **Updating the spot (E10).** When the customer opens the app and is more than about 30 m from their delivery spot, a sheet offers "Moved to a different seat?". Updating means a new position plus a new spot photo (one shutter tap; the selfie stays), or a QR scan. The server checks the new spot is still in range. If it isn't, the sheet says so and offers the Call button.

## Seller app

Tabs: Orders, Menu, Stand. Built from the existing design system (`tokens.css`, `components.css`, the customer app's components).

- **Sign in.** Email and password.
- **Orders.** New orders on top with a 5-minute countdown and Accept and Decline. Then orders being made, then the one on the way.
- **Order screen.** The two photos or the spot label, a map (selling point, seller, delivery spot, customer's live dot), the items and note, Call, and one main button for the next step: Accept, then "On my way", then "Delivered".
- **Menu.** Sold-out switch per item. Edit price and description.
- **Stand.** "Sell from here", "Pause orders", the café's name and phone number, sign out.

## Customer app changes

- Stripe payment sheet in place of the 2.8 stand-in. 2.7 offers the methods Stripe offers.
- Status "Waiting for the café to accept", and screens for declined, expired and cancelled ("You weren't charged"). Cancel is possible while waiting.
- 4.2 Order status: a real map with the delivery spot, the seller walking over and the customer's own dot, plus a Call button for the café.
- The E10 sheet.
- Push notification permission and token registration.
- Profile tab: phone number (change it by reusing screens 1.2 and 1.3), location and camera permissions (opening the system Settings), terms, privacy, sign out, delete account. A developer section in development builds only.
- The existing E1, E6 and E7 handling keeps working with the new server.

## Build order

1. **Monorepo.** Commit open work, move the app to `apps/customer`, create `packages/shared`, rename the folder. The customer app works exactly as before.
2. **Server foundation.** Accounts for cafés, the café script, the order lifecycle with the 5-minute timer, Stripe reserve and capture, WebSocket, push.
3. **Features end to end,** across server, seller app and customer app, each one demoable:
   1. An order arrives at the seller, who accepts or declines it.
   2. The delivery walk, with both maps and Call.
   3. Updating the spot (E10).
   4. Menu and stand settings.
4. **Customer app finish.** Stripe payment sheet, Profile tab, end-state screens.

## Left to the builder

- Which map library (react-native-maps or expo-maps), after reading the SDK 58 docs.
- Exact API routes and message formats. They go in the API document.
- How the shared package splits code (types, API client, theme, components) and what stays in each app.
- How often positions are sent, the reconnect strategy, and the server's timer interval.
- Tests: the server's order lifecycle gets automated tests (Node's built-in test runner). App testing stays manual for the demo.
- Wording of messages and notifications, in the style of the existing app.
