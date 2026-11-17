# Shoot

Order a coffee from your seat, and the café brings it to you. A school project: a customer app, an app for the café, and the server between them.

## Layout

- `apps/customer`: the customer app (Expo, iOS and Android)
- `apps/seller`: the café's app (Expo, Android first): sign in, see orders, accept or decline
- `server`: the backend (Node, TypeScript, SQLite). Its API is described in `server/README.md`.
- `packages/shared`: types, order rules and the HTTP client, shared by the apps and the server (no React Native)
- `packages/ui`: the design system (theme and components), shared by both apps

## Run it

```bash
npm install                        # once, at the root
npm run dev -w @shoot/server       # the server, on port 4000
cd apps/customer && npx expo start # the customer app (iPhone)
cd apps/seller && npx expo start --dev-client  # the seller app (Android, development build)
```

Your phone and your computer must be on the same Wi-Fi. In development, the SMS code is always `123456`, and the seller app signs in with `saaripaahtimo@shoot.test` / `shoot-demo`.

The seller app needs a development build, because Expo Go can't receive push notifications. Install the APK from the latest EAS build (`npx eas-cli@latest build --profile development --platform android` in `apps/seller`), then start it with `--dev-client` as above. The build server gets `google-services.json` from the EAS secret `GOOGLE_SERVICES_JSON`; locally it's `apps/seller/google-services.json`, which is not in git.

### Stripe (test mode)

Without keys the server uses fake payments (the card ending 0002 declines). For Stripe's real payment sheet, put both test keys from dashboard.stripe.com → Developers → API keys in `server/.env.local` (not in git):

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PUBLISHABLE_KEY=pk_test_…
```

Then pay with the test card 4242 4242 4242 4242, any future date, any CVC. The card 4000 0000 0000 0002 is declined. Stripe's sheet is a native module: the customer app needs a development build (`npx expo run:ios --device` in `apps/customer`), not Expo Go.

### Google Maps key (Android)

The maps on Android need a Google Maps API key; the iPhone uses Apple Maps without one. Showing a map in an Android app costs nothing ("Maps SDK for Android"), but Google asks for a billing account.

1. In the [Google Cloud console](https://console.cloud.google.com/apis), create a project and enable **Maps SDK for Android**.
2. Create an API key. Under **Application restrictions** choose Android apps and add `com.stanleyr.shootseller` with the SHA-1 from expo.dev → shoot-seller → Credentials → Android. Under **API restrictions** allow only Maps SDK for Android.
3. In `apps/seller`, store it for EAS builds: `npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --value <key> --environment development --visibility sensitive`. For local builds, put `GOOGLE_MAPS_API_KEY=<key>` in `apps/seller/.env.local` (not in git).

### Try an order on two phones

1. Start the server. Without `STRIPE_SECRET_KEY` in `server/.env.local`, payments are fake (the card ending 0002 is declined).
2. Android: open the seller app and sign in. The server log shows `POST /seller/push-token 204`.
3. iPhone: order from Saaripaahtimo. The Android phone rings, also when locked. Tapping the notification opens the order.
4. Accept within 5 minutes, and the customer sees Preparing. Or decline with a reason, or let the 5 minutes run out: the customer isn't charged.

`npm run check` type-checks every part.

## Demo day

On demo day nothing depends on the Wi-Fi: the laptop runs the server, and an HTTPS tunnel (ngrok, fixed address `https://chance-clean-petted.ngrok-free.dev`) makes it reachable from both phones, also on mobile data. Both apps are release builds with that address inside: no `npx expo start` needed.

**Once, on the laptop:** `ngrok config add-authtoken <token>` (the token from dashboard.ngrok.com, never in git).

**The builds** (rebuild the iPhone one at most 7 days before the demo: a free Apple account's apps stop opening after that):

```bash
# Android, seller app: an APK with the address inside. Download it from the link EAS prints.
cd apps/seller && npx eas-cli@latest build --profile demo --platform android

# iPhone, customer app: plugged in by cable, trusted in Settings → General → VPN & Device Management.
cd apps/customer && EXPO_PUBLIC_API_URL=https://chance-clean-petted.ngrok-free.dev npx expo run:ios --device --configuration Release
```

**On the day,** two terminals:

```bash
npm run start -w @shoot/server    # the server (prints the SMS code and the seller sign-in)
npm run tunnel -w @shoot/server   # the tunnel; keep it open
```

Check the tunnel: `https://chance-clean-petted.ngrok-free.dev/config` in a browser answers `{"payments":…}` (ngrok shows a warning page first in browsers; the apps don't see it).

## Final test checklist

Everything here was built without trying it on a phone. Reset the database first (`npm run reset -w @shoot/server`), then start the server and both apps.

**Orders arriving (seller app on Android)**
- [ ] Sign in; the server log shows `POST /seller/push-token 204`.
- [ ] An order from the iPhone rings the Android phone once, also when it's locked. Tapping the notification opens that order, also when the app was closed.
- [ ] Accept: the iPhone shows Preparing within a second. Decline with a reason, and let one run out the 5 minutes: the customer isn't charged.
- [ ] Stop the server mid-way and start it again: both apps catch up within 30 s.

**The walk**
- [ ] Both order screens show a map: Apple Maps on the iPhone, Google Maps on Android.
- [ ] "On my way" asks for location, then "Allow all the time". A "Delivering order #…" notification appears on Android.
- [ ] With the Android screen locked, walk around: the iPhone's map shows the seller's dot moving.
- [ ] With the iPhone's order screen open, the seller's map shows the customer's dot.
- [ ] Close the seller app mid-walk and open it again: sharing carries on.
- [ ] "Delivered" removes the Android notification; the dots disappear.
- [ ] Call opens the dialler with the café's number (iPhone) and the customer's number (Android).
- [ ] Without "Allow all the time", the seller's order screen says to keep the app open.

**Moved to a different seat (E10)**
- [ ] With a live order placed with photos, walk about 40 m away (still near the café) and open the app again: "Moved to a different seat?" appears.
- [ ] "Take a new spot photo": one tap, then the order screen. The seller's order shows the new photo; the selfie is the same.
- [ ] "Scan the code at your seat" works too (for an order placed with a code, it's the only option).
- [ ] Far outside the café's range, the new spot is refused with a message and a Call button.
- [ ] "No, I'm still here" doesn't ask again until the app has been in the background.

**Menu and stand (seller app)**
- [ ] Menu: switch an item off; the customer app shows it sold out, and an order with it is refused.
- [ ] Menu: tap an item, change the price to "3,90" and the description; the customer app shows both after a refresh.
- [ ] Stand: "Pause orders" on; the customer app can't order from the café. Off again; it can.
- [ ] Stand: "Sell from here" with no open orders moves the café on the customer's map and its delivery range. With an open order, the button stays off and says why.

**Paying with Stripe (customer app)**
- [ ] With both Stripe keys set, "Pay" opens Stripe's sheet; 4242… pays, and the order reaches the café.
- [ ] Close Stripe's sheet: back to the pay sheet with no error; paying again works (Stripe's dashboard shows one payment, not two).
- [ ] 4000 0000 0000 0002 is declined inside Stripe's sheet; nothing is charged.
- [ ] Accept on the seller app: the payment in Stripe's dashboard turns from "Uncaptured" to "Succeeded". Decline: it's cancelled.

**When the café says no (customer app)**
- [ ] Decline with "Too busy": the order screen says the café is too busy, "You weren’t charged", and "Order again" fills the cart.
- [ ] Let 5 minutes pass: "didn’t answer in time".
- [ ] While waiting, "Cancel order" asks first, then shows "You cancelled this order". Cancelling just as the café accepts says it was already accepted.
- [ ] Finished orders in the Orders tab open the order screen.

**Profile (customer app)**
- [ ] Your number shows. "Change" sends a code to a new number; after the code, Profile shows the new number. A number another account uses is refused with a message.
- [ ] Location and Camera say "Allowed" or "Not allowed"; "Open Settings" opens the phone's settings, and coming back shows the change.
- [ ] Terms and Privacy open.
- [ ] Sign out goes back to the welcome screen. Delete account asks first, then does the same; signing in again with that number makes a new account.

