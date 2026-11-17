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
cd apps/seller && npx expo start   # the seller app (Android)
```

Your phone and your computer must be on the same Wi-Fi. In development, the SMS code is always `123456`, and the seller app signs in with `saaripaahtimo@shoot.test` / `shoot-demo`.

`npm run check` type-checks every part.
