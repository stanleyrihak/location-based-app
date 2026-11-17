# Moved to a different seat (E10) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a customer with a live order opens the app more than about 30 m from their delivery spot, a sheet offers to update it with a new spot photo or a QR scan; the café sees the new spot at once.

**Architecture:** A pure `movedFromSpot` rule in `@shoot/shared` decides; a root-level hook in the customer app checks it each time the app comes to the front and opens a sheet route. The server gets one endpoint, `POST /orders/:id/spot`, that checks range and the spot, replaces the delivery (deleting the old spot photo) and broadcasts `order.updated`, so the seller's map and photos change live.

**Tech Stack:** expo-camera (existing camera components), expo-location, Hono, node:test.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (Location → "Updating the spot (E10)"; build order 3.3)

## Global Constraints

- Threshold: more than 30 m from `order.deliverTo` (spec: "about 30 m").
- Only for live orders (`received`, `preparing`, `on-the-way`).
- Updating means a new position plus a new spot photo (one shutter tap; the selfie stays), or a QR scan.
- The server checks the new spot is in the café's range. If it isn't, the sheet says so and offers the Call button.
- Photos aren't kept: a replaced spot photo is deleted.
- The owner tests on phones only at the end: by-hand checks go into the README checklist, not into the tasks.
- Copy style: the existing app's.

## Review Focus

1. The new position is outside the café's range. Expected: 422 `out_of_range` with `distanceM` and `radiusM`, the order unchanged; the sheet says so and shows Call. Test in Task 2.
2. The order ended (or was delivered) while the sheet was open. Expected: 409 `status_conflict`, nothing changed; the sheet closes with a message. Test in Task 2.
3. A photo update for an order placed with a spot code (it has no selfie). Expected: 422 `needs_selfie`; the app never offers the photo option for such an order. Test in Task 2.
4. The customer says "No, I'm still here". Expected: not asked again for that order until the app is opened again. Pure rule tested in Task 1 (`movedFromSpot` returns false for a dismissed order).
5. GPS jitter near 30 m. Expected: no sheet for a fix less accurate than the distance it would report (accuracy > distance − 30). Test in Task 1.

---

### Task 1: Shared: distance and the "moved" rule

**Files:**
- Create: `packages/shared/src/geo.ts` (move `distanceInMetres` here from `apps/customer/src/utils/geo.ts` and `server/src/geo.ts`; both keep their other functions and import this one), `packages/shared/test/geo.test.ts`

**Interfaces:**
- Produces:
  - `distanceInMetres(a: Coordinates, b: Coordinates): number`
  - `MOVED_THRESHOLD_M = 30`
  - `movedFromSpot(order: Pick<Order, 'id' | 'status' | 'deliverTo'>, here: Coordinates & { accuracy?: number | null }, dismissed: ReadonlySet<string>): boolean`: true only for a live order not in `dismissed`, more than 30 m away, and with `accuracy` (when given) at most `distance − 30`.

- [ ] **Step 1: Failing tests:** `movedFromSpot is true 50 m away`, `false 20 m away`, `false for a delivered order`, `false for a dismissed order`, `false when the fix's accuracy (40 m) could explain the 50 m`, and `distanceInMetres is about 111 km per degree of latitude`.
- [ ] **Step 2: Run** `npm test -w @shoot/shared`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** and switch the server and the customer app to the shared `distanceInMetres`.
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(shared): the moved-from-your-spot rule`

### Task 2: Server: `POST /orders/:id/spot`

**Files:**
- Modify: `server/src/domain/orders.ts` (`updateSpot`), `server/src/domain/photos.ts` (`deletePhoto(deps, path)` for one file), `server/src/routes/orders.ts`, `server/README.md`
- Test: `server/test/update-spot.test.ts`

**Interfaces:**
- Consumes: `distanceInMetres` (Task 1).
- Produces: `POST /orders/:id/spot` with `{ coordinates, delivery: { kind: 'spot', spotCode } | { kind: 'photo', spot: '/uploads/…' } }` → 200 the updated order (`deliverTo` = the new coordinates). Errors: 404 `order_not_found` (not yours), 409 `status_conflict` (not live), 422 `out_of_range` `{ distanceM, radiusM }`, 422 `not_a_spot`, 422 `needs_selfie` (photo update on a spot-code order), 400 bad body. On success: `updated_at` changes, the old spot photo is deleted when replaced, and `hub.orderChanged` sends the order to the customer and the café.

- [ ] **Step 1: Failing tests:** `a new spot code moves the delivery and the café hears it` (socket gets `order.updated` with the new `spotLabel` and `deliverTo`), `a new spot photo keeps the selfie and deletes the old spot photo` (file gone from `uploadsDir`), `out of range is 422 and changes nothing` (Review Focus 1), `a delivered order is 409` (Review Focus 2), `a photo for a spot-code order is 422 needs_selfie` (Review Focus 3), `someone else's order is 404`.
- [ ] **Step 2: Run** `npm test -w @shoot/server`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): update the delivery spot of a live order (E10)`

### Task 3: Customer app: the check, the sheet, photo and scan

**Files:**
- Create: `apps/customer/src/hooks/use-moved-check.ts`, `apps/customer/src/app/moved/_layout.tsx`, `apps/customer/src/app/moved/[id].tsx` (the sheet), `apps/customer/src/app/moved/photo.tsx` (one shot), `apps/customer/src/app/moved/scan.tsx`
- Modify: `apps/customer/src/data/api.ts` (`updateSpot(orderId, input)`; uploads the photo with the existing `uploadPhoto`; maps 422 `out_of_range` to `OutOfRangeError`, 409 to an "order changed" error), `apps/customer/src/app/_layout.tsx` (run the hook; register `moved` with the sheet as `formSheet`, `fitToContents`, like the pay sheet), `README.md` (checklist lines)

**Interfaces:**
- Consumes: `movedFromSpot`, `MOVED_THRESHOLD_M` (Task 1), `POST /orders/:id/spot` (Task 2), `CallButton` (`@shoot/ui`), the camera components in `src/components/camera/`.
- Produces:
  - `useMovedCheck()`: on start and each time the app becomes active, reads a fresh position (`getUserLocation` with its accuracy) and, for the first live order where `movedFromSpot` is true, opens `/moved/[id]`. Dismissed order ids live in memory (a `Set` in the module), so a new app start asks again (Review Focus 4).
  - Sheet `/moved/[id]`: title "Moved to a different seat?", text "You’re about {distance} from where {cafe} will bring your order.", buttons "Take a new spot photo" (only for photo orders), "Scan the code at your seat", "No, I’m still here" (adds the id to the dismissed set). On `OutOfRangeError`: "That’s outside {cafe}’s delivery area ({radius})." plus `CallButton` with the café's phone. On a 409: "This order changed in the meantime." and close.
  - `/moved/photo`: one shutter tap, then `updateSpot` with the current position and the photo; back to the order screen on success.
  - `/moved/scan`: reuse the checkout scanner's scanning part; `updateSpot` with the code.

- [ ] **Step 1:** Implement. Share the camera parts with checkout by extracting from `checkout/photo.tsx` and `checkout/scan.tsx` only what both need (no behaviour change in checkout).
- [ ] **Step 2: Run** `npm run check`, `npx expo lint`, `npx tsc --noEmit` after a short `npx expo start` (typed routes), and `npx expo export --platform ios`. Expected: PASS.
- [ ] **Step 3:** Add the by-hand lines to the README checklist: walk 40 m away with a live order and reopen the app; photo update shows the new photo on the seller's order; scan works; far away gives the out-of-range message and Call; "No, I’m still here" doesn't ask again until the app restarts.
- [ ] **Step 4: Commit** `feat(customer): moved to a different seat (E10)`
