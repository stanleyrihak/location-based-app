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

