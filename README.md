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

### Try an order on two phones

1. Start the server. Without `STRIPE_SECRET_KEY` in `server/.env.local`, payments are fake (the card ending 0002 is declined).
2. Android: open the seller app and sign in. The server log shows `POST /seller/push-token 204`.
3. iPhone: order from Saaripaahtimo. The Android phone rings, also when locked. Tapping the notification opens the order.
4. Accept within 5 minutes, and the customer sees Preparing. Or decline with a reason, or let the 5 minutes run out: the customer isn't charged.

`npm run check` type-checks every part.
