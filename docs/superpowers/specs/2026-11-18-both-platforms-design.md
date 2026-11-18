# Both apps on iPhone and Android (short design)

## Intent

The owner wants to install and test both apps (seller and customer) on an iPhone and on an Android phone. The owner has a free Apple account. Remote push notifications are the only feature that needs a paid Apple account, so they go. For the demo, an alert inside the open app is enough.

## Goals

- The seller app builds and runs on an iPhone (`npx expo run:ios --device`) with a free Apple account.
- The customer app builds for Android through EAS, like the seller app does now.
- The seller still hears a new order (sound, vibration, banner) while the app is open, on both platforms.
- The seller's position reaches the customer during the walk with the screen locked, on both platforms.

## Non-goals

- Remote push of any kind, to the seller or the customer.
- An alert when the seller app is closed or in the background. The README says to keep the seller app open.

## Constraints

- No paid Apple account: no `aps-environment` entitlement, no Apple Pay.
- Secrets stay out of git (the repository is public). The Google Maps key for the customer's Android build is an EAS environment variable, as for the seller.
- Never edit `ios/` or `android/`; they are generated.

## Approaches

1. **Chosen: turn off remote push, keep local notifications.** The `expo-notifications` plugin with `enableRemoteNotifications: false` adds no push entitlement. `scheduleNotificationAsync` still rings while the app is open.
2. Remove `expo-notifications` entirely. Rejected: the seller would lose the sound and banner for a new order.
3. Pay for an Apple developer account. Rejected: the owner doesn't want to.

## Design

- **Seller app.**
  - Plugin `expo-notifications` gets `enableRemoteNotifications: false`.
  - Delete `notifications/push-token.ts` and `registerPushToken`. The session provider still asks for notification permission, so local alerts can show.
  - Keep the tap on a local "New order" notification opening the order.
  - Remove `googleServicesFile` from `app.config.ts`. Delete the local `google-services.json` (it is gitignored) and the EAS file variable `GOOGLE_SERVICES_JSON` (by the owner; the README says how).
  - `expo-location` gets `isIosBackgroundLocationEnabled: true` and `locationAlwaysAndWhenInUsePermission` text. Background sharing then works on iOS as on Android.
- **Server.**
  - Remove the push module (`push/`), its wiring in `deps.ts`, `main.ts` and `domain/events.ts`, the `POST` push-token routes, the token deletes in sign-out and delete-account, and the `push_tokens` table. Tests that cover push go too. The live connection (WebSocket) stays the only way news reaches the apps.
- **Customer app.**
  - `android.package` `com.stanleyr.shoot`. Add `eas.json` with profiles `development` and `demo` (same shape as the seller's) and an EAS project id (`eas init`, run by Claude with the owner's approval of the new EAS project).
  - EAS environment variable `GOOGLE_MAPS_API_KEY` for the customer project, set by the owner (the README says how).
- **README.**
  - How to run each app on each platform.
  - The limits: keep the seller app open to hear orders; a free Apple account allows 3 sideloaded apps and they expire after 7 days.
  - Checklist lines for both platforms.

## Left to the builder

- Exact wording of the iOS "Always" location text.
- Whether the `push_tokens` table is dropped by a schema change or simply no longer created (the database is a dev file that can be reset).
