# Both apps on iPhone and Android Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Both apps build and run on an iPhone (free Apple account) and on Android: no remote push, local alerts kept, seller background location on iOS too, an EAS Android build for the customer app.

**Architecture:** The server loses its push module; the live connection (WebSocket) is the only way news reaches the apps. The seller app keeps `expo-notifications` for local alerts only (`enableRemoteNotifications: false`, so no `aps-environment` entitlement) and turns on iOS background location. The customer app gets an Android package name and an EAS project like the seller's.

**Tech Stack:** Hono, node:test, Expo SDK 58 config plugins (expo-notifications, expo-location), EAS CLI.

**Spec:** `docs/superpowers/specs/2026-11-18-both-platforms-design.md`

## Global Constraints

- No paid Apple account: no `aps-environment` entitlement, no Apple Pay.
- Secrets stay out of git (public repository). The customer's Google Maps key is an EAS environment variable `GOOGLE_MAPS_API_KEY`, set by the owner.
- Never edit `ios/` or `android/`; they are generated.
- The seller still hears a new order (sound, vibration, banner) while the app is open, on both platforms.
- The owner tests on phones at the end; by-hand checks go to the README checklist.

## Review Focus

1. A seller phone that registered a push token before this change, with an old dev database. Expected: the server starts and works; the unused `push_tokens` table is ignored. Checked in Task 1 by starting the server on the existing `server/data` database.
2. The seller taps a local "New order" notification. Expected: the order opens (the tap handler in `_layout.tsx` stays). Checked by hand (README checklist).
3. iOS seller who chooses "Allow While Using App" only. Expected: mode `'foreground'`, positions shared while the app is open, no crash. Checked by hand.
4. The iOS build of the seller app has no push entitlement and has background location. Expected: `npx expo config --type introspect` shows no `aps-environment` and `UIBackgroundModes` with `location`. Task 2, Step 2.
5. The customer's Android build without `GOOGLE_MAPS_API_KEY`. Expected: the README says to set it before building; the map would crash without it. README in Task 3.

---

### Task 1: Server: no push

**Files:**
- Delete: `server/src/push/` (whole folder), `server/test/push.test.ts`
- Modify: `server/src/deps.ts` (no `push`), `server/src/main.ts`, `server/src/domain/orders.ts` (the change notifier calls only the hub), `server/src/domain/events.ts` (comment), `server/src/routes/auth.ts` and `server/src/routes/seller-auth.ts` (remove `POST /me/push-token`, `POST /seller/push-token` and the `DELETE FROM push_tokens` lines), `server/src/db/schema.ts` (remove the `push_tokens` table; no migration: an old dev database keeps an unused table), `server/test/helpers.ts` (no fake push; `createTestApp` returns `{ app, deps, clock, payments, hub }`), `server/README.md` (remove the push rows and the "Push notifications" section)
- Test: `server/test/auth.test.ts` (or the file that holds the sign-in tests)

**Interfaces:**
- Produces: `Deps` without `push`. No push-token routes.

- [ ] **Step 1: Failing test** `push token routes are gone`: a signed-in customer's `POST /me/push-token {token:'x'}` and a signed-in seller's `POST /seller/push-token {token:'x'}` both answer 404.
- [ ] **Step 2: Run** `npm test -w @shoot/server`. Expected: FAIL (both answer 204).
- [ ] **Step 3: Implement** the removals above. Tests that used `push` from `createTestApp` drop those assertions.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS. Then start the server on the existing database (`npm run dev -w @shoot/server`, stop after "listening"). Expected: no error (Review Focus 1).
- [ ] **Step 5: Commit** `refactor(server): no push notifications; the live connection carries all news`

### Task 2: Seller app: local alerts only, background location on iPhone

**Files:**
- Delete: `apps/seller/src/notifications/push-token.ts`
- Modify: `apps/seller/app.json` (`expo-notifications` options add `"enableRemoteNotifications": false`; `expo-location` adds `"isIosBackgroundLocationEnabled": true` and `"locationAlwaysAndWhenInUsePermission": "Used to show the customer where you are while you bring their order, also with the screen locked."`), `apps/seller/app.config.ts` (no `googleServicesFile`, comment updated), `apps/seller/src/data/api.ts` (no `registerPushToken`), `apps/seller/src/providers/session-provider.tsx` (still `askNotificationPermission()` after sign-in; no token; comments say alerts ring only while the app is open), `apps/seller/src/notifications/new-order-alert.ts` (no duplicate-push logic: the handler always shows the local alert; `alerted` map goes), `apps/seller/src/location/share-position.ts` (`startLocationUpdatesAsync` adds `showsBackgroundLocationIndicator: true`, `pausesUpdatesAutomatically: false`, `activityType: Location.ActivityType.Fitness`; comment covers iOS), `.gitignore` (the `google-services.json` lines go)
- Owner, not code: delete local `apps/seller/google-services.json` (Claude deletes it; it's gitignored and no longer read) and the EAS file variable `GOOGLE_SERVICES_JSON` (README tells the owner how: `npx eas-cli@latest env:delete --variable-name GOOGLE_SERVICES_JSON` in `apps/seller`).

**Interfaces:**
- Consumes: nothing from Task 1 at build time; the app just stops calling `/seller/push-token`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Run** in `apps/seller`: `npx expo config --type introspect --json`. Expected: `ios.entitlements` has no `aps-environment`; `ios.infoPlist.UIBackgroundModes` contains `location`; `android.googleServicesFile` absent (Review Focus 4).
- [ ] **Step 3: Run** `npm run check`, `npx expo lint`, typed routes + `npx tsc --noEmit`, `npx expo export --platform ios` and `--platform android` in `apps/seller`. Expected: PASS.
- [ ] **Step 4: Commit** `feat(seller): runs on iPhone: local alerts only, background location on iOS`

### Task 3: Customer app on Android, and the README

**Files:**
- Create: `apps/customer/eas.json` (same as the seller's: `cli`, profiles `development` and `demo`, `demo.env.EXPO_PUBLIC_API_URL` = `https://chance-clean-petted.ngrok-free.dev`)
- Modify: `apps/customer/app.json` (`android.package`: `com.stanleyr.shoot`; `owner`: `stanley_r`; `extra.eas.projectId` written by `npx eas-cli@latest init --non-interactive --force` in `apps/customer`), `README.md`

**Interfaces:**
- Produces: an EAS project for the customer app. The owner then sets `GOOGLE_MAPS_API_KEY` (`npx eas-cli@latest env:create --name GOOGLE_MAPS_API_KEY --environment development --visibility sensitive` in `apps/customer`) and builds `--profile development --platform android`.

- [ ] **Step 1:** Add the package name, owner and `eas.json`; run `eas init`. Expected: `app.json` has `extra.eas.projectId`.
- [ ] **Step 2: Run** in `apps/customer`: `npx expo config --type public --json`. Expected: `android.package` `com.stanleyr.shoot`, a projectId. Then `npx expo export --platform android`. Expected: PASS.
- [ ] **Step 3: README:**
  - Layout: both apps "iOS and Android".
  - Run it: a table, each app × each platform. iPhone: `npx expo run:ios --device` (free Apple account; trust the developer in Settings → General → VPN & Device Management). Android: the EAS development build APK, then `npx expo start --dev-client`.
  - Replace the push paragraph: there are no push notifications; the seller hears a new order only while the app is open, so keep it open in the demo.
  - Free Apple account: at most 3 such apps on a phone, and they stop opening after 7 days (run `run:ios` again).
  - How to set the customer's `GOOGLE_MAPS_API_KEY` before the first Android build (Review Focus 5), and how to delete `GOOGLE_SERVICES_JSON` from the seller project.
  - Demo day: build both `--profile demo` APKs and both iOS Release builds with `EXPO_PUBLIC_API_URL`.
  - Checklist: replace the two `POST /seller/push-token 204` lines with "a new order rings with the seller app open" on each platform; add: seller on iPhone sees the "Always" location question and the blue location indicator during a walk; seller on iPhone with "While Using" only still shares while open (Review Focus 3); tapping a "New order" notification opens the order (Review Focus 2); customer on Android shows the Google map and offers Google Pay.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(customer): Android build through EAS; README for both platforms`
