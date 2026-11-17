# Customer app finish (Stripe, end states, Profile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The customer pays with Stripe's payment sheet (test mode), sees honest screens when an order is declined, not accepted or cancelled (and can cancel while waiting), and has a real Profile tab.

**Architecture:** The server tells the app how payments work (`GET /config`: Stripe with its publishable key, or fake). With Stripe, the app reserves the money through Stripe's PaymentSheet between the existing two steps (`POST /orders` gives the client secret, then `POST /orders/:id/confirm`). End states live on the existing 4.2 order screen. Profile reuses the sign-in screens to change the number.

**Tech Stack:** @stripe/stripe-react-native (Expo SDK 58 version), Hono, node:test, Expo Router.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (Payments; Customer app changes; build order 4)

## Global Constraints

- Stripe test mode. The secret key stays on the server; the app gets the publishable key and one PaymentIntent's client secret.
- No paid Apple account: no Apple Pay (no `merchantIdentifier`), and no push entitlement in the customer app. Google Pay through the sheet on Android only.
- Without `STRIPE_SECRET_KEY` the fake payments keep working exactly as now (dev card 0002 declines).
- End states say "You weren’t charged". Cancel is possible only while waiting for the café (`received`).
- Profile: phone number (change it by reusing 1.2 and 1.3), location and camera permissions (open the system Settings), terms, privacy, sign out, delete account, a developer section in development builds only.
- The owner tests on phones at the end; by-hand checks go to the README checklist.

## Review Focus

1. The customer closes Stripe's sheet without paying. Expected: nothing reserved, the pay sheet comes back; paying again reuses the same order and client secret (no second PaymentIntent). Checked by hand; the reuse rule is in `use-place-order.ts`.
2. Stripe mode but no publishable key on the server. Expected: `GET /config` says `stripe` with a null key, and the app says payments aren't set up instead of crashing. Test in Task 1.
3. Cancel tapped at the moment the café accepts. Expected: the server's 409 shows "The café already accepted it" and the screen follows the live status. Server behaviour tested already; message checked by hand.
4. Delete account. Expected: a confirmation first; then the session ends and onboarding shows. Server tested already.
5. Changing the number to one another account uses. Expected: 409 `phone_taken` shown on the code screen. Server tested already; message checked by hand.

---

### Task 1: Server: `GET /config`

**Files:**
- Modify: `server/src/config.ts` (`stripePublishableKey` from `STRIPE_PUBLISHABLE_KEY`), `server/src/app.ts` (route), `server/src/main.ts` (warn when the secret key is set but the publishable key isn't), `server/README.md`
- Test: `server/test/config.test.ts`

**Interfaces:**
- Produces: `GET /config` (no sign-in) → `{ payments: 'stripe' | 'fake', stripePublishableKey: string | null }`.

- [ ] **Step 1: Failing tests:** `config says fake without a Stripe key`, `config gives the publishable key with Stripe`, `config says stripe with a null key when only the secret key is set`.
- [ ] **Step 2: Run**, expect FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check`, expect PASS.
- [ ] **Step 5: Commit** `feat(server): GET /config tells the app how payments work`

### Task 2: Customer app: Stripe's payment sheet

**Files:**
- Modify: `apps/customer/package.json` (`npx expo install @stripe/stripe-react-native`), `apps/customer/app.json` (plugin `["@stripe/stripe-react-native", { "enableGooglePay": true }]`, no merchant id), `apps/customer/src/app/_layout.tsx` (`StripeProvider` with the key from `/config`, `urlScheme` = the app's scheme), `apps/customer/src/data/api.ts` (`getConfig`), `apps/customer/src/data/queries.ts` (`useConfig`, staleTime Infinity), `apps/customer/src/payments/payment-methods.ts` (in Stripe mode one method: `{ id: 'stripe', label: 'Card' (Android: 'Card or Google Pay'), shortLabel: 'Card', icon: 'card' }`), `apps/customer/src/data/use-place-order.ts`, `apps/customer/src/app/checkout/pay-sheet.tsx`, `README.md`

**Interfaces:**
- Consumes: `GET /config` (Task 1).
- Produces: in Stripe mode, `usePlaceOrder` does start → `initPaymentSheet({ paymentIntentClientSecret, merchantDisplayName: 'Shoot', returnURL: '<scheme>://stripe-redirect', defaultBillingDetails: { address: { country: 'FI' } } })` → `presentPaymentSheet()` → confirm. The started order id and client secret are kept between tries (Review Focus 1). A closed sheet throws `PaymentCancelledError` (back to the pay sheet with no error message); a failed sheet throws `PaymentDeclinedError`. Stripe mode without a key throws `PaymentsNotSetUpError` ("Payments aren’t set up on this server.").

- [ ] **Step 1:** Install, configure, implement.
- [ ] **Step 2: Run** `npm run check`, lint, typed routes + tsc, `npx expo export --platform ios`. Expected: PASS.
- [ ] **Step 3:** README: `STRIPE_PUBLISHABLE_KEY=pk_test_…` next to the secret key in `server/.env.local`; test card 4242 4242 4242 4242, any future date, any CVC; 4000 0000 0000 0002 declines. Checklist lines for paying, closing the sheet, a declined card.
- [ ] **Step 4: Commit** `feat(customer): pay with Stripe's payment sheet`

### Task 3: Customer app: end states and Cancel

**Files:**
- Modify: `apps/customer/src/app/order/[id].tsx`, `apps/customer/src/data/api.ts` (`cancelOrder(orderId): Promise<Order>`), `apps/customer/src/data/order-format.ts` (`DECLINE_TEXT: Record<DeclineReason, string>`)

**Interfaces:**
- Produces:
  - `received`: a "Cancel order" text button with a confirmation alert ("Cancel this order? You won’t be charged."); on 409 the message "The café already accepted it." The answer goes into the Orders cache.
  - `declined`: headline "Declined", text from the reason ("Sold out" → "{café} ran out of something in your order.", "Too busy" → "{café} is too busy right now.", "Closing soon" → "{café} is closing soon.", "Other" → "{café} couldn’t take your order."), then "You weren’t charged." and an "Order again" button (fills the cart like the Orders tab's "Order again" and opens the café).
  - `expired`: "{café} didn’t answer in time. You weren’t charged." and "Order again".
  - `cancelled`: "You cancelled this order. You weren’t charged."
  - The Orders tab's ended orders open this screen too.

- [ ] **Step 1:** Implement. **Step 2: Run** checks as in Task 2. **Step 3:** Checklist lines. **Step 4: Commit** `feat(customer): declined, not accepted and cancelled orders, and Cancel`

### Task 4: Customer app: Profile tab

**Files:**
- Modify: `apps/customer/src/app/(tabs)/profile.tsx`, `apps/customer/src/app/(onboarding)/phone-number.tsx` and `sms-code.tsx` (a `change=1` search param: send the code, then `POST /me/phone` instead of signing in; back to Profile when done), `apps/customer/src/data/api.ts` (`changePhone(phone, code): Promise<User>`, `signOut()`, `deleteAccount()`), and the root layout if the onboarding screens need registering outside the signed-out guard (as `change-phone` / `change-code` routes that render the same components).

**Interfaces:**
- Produces: Profile with sections: "Phone number" (the number from `GET /me`, "Change"), "Permissions" (Location and Camera: "Allowed" / "Not allowed", "Open Settings" via `Linking.openSettings()`), "About" (Terms, Privacy), "Account" ("Sign out"; "Delete account" with a destructive confirmation), and in `__DEV__` "Developer" (Reset onboarding).

- [ ] **Step 1:** Implement. **Step 2: Run** checks as in Task 2. **Step 3:** Checklist lines. **Step 4: Commit** `feat(customer): profile tab`
