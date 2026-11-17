# Menu and stand settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The seller can move their stand to where they stand ("Sell from here"), pause orders, mark items sold out, and change prices and descriptions, from the seller app.

**Architecture:** The server already has `PATCH /seller/cafe { isPaused }` and `PATCH /seller/menu-items/:id`. This adds the selling point to `PATCH /seller/cafe` (refused while orders are unfinished) and `GET /seller/menu`. The seller app gets a Menu tab, an item editing sheet, and a real Stand tab with a map screen to place the stand.

**Tech Stack:** Hono, node:test, Expo Router (tabs, formSheet), React Query mutations, expo-location, `DeliveryMap` from `@shoot/ui`.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (Location → "Selling point"; Seller app → Menu, Stand; build order 3.4)

## Global Constraints

- Selling point: set with "Sell from here" (the phone's position, with a pin to adjust). Locked while the café has orders that aren't finished (`received`, `preparing`, `on-the-way`).
- Menu: sold-out switch per item; edit price and description. No adding or removing items, no photos (non-goal).
- Stand: "Sell from here", "Pause orders", the café's name and phone number, sign out.
- Tabs: Orders, Menu, Stand.
- No new native modules: the Android development build is already made. Switches are React Native's `Switch`.
- The owner tests on phones at the end; by-hand checks go to the README checklist.

## Review Focus

1. "Sell from here" while an order is unfinished. Expected: 409 `cafe_busy`, the stand stays; the app says why. Test in Task 1.
2. A price typed as "3,50", "3.5", "" or "abc". Expected: "3,50" and "3.5" become 350; empty or not a number is refused in the app before sending. Test in Task 2 (`parsePriceInput`).
3. Coordinates outside the globe in `PATCH /seller/cafe`. Expected: 400, nothing changes. Test in Task 1.
4. Two quick taps on a sold-out switch. Expected: the last tap wins, the switch shows the server's answer. Checked by hand.
5. Customers who already loaded the café list see the old position until they refresh. Expected: the server checks range against the new position for every new order. Test in Task 1.

---

### Task 1: Server: selling point and the seller's menu

**Files:**
- Modify: `server/src/routes/seller-cafe.ts`, `server/README.md`
- Test: `server/test/seller-cafe.test.ts` (new)

**Interfaces:**
- Produces:
  - `PATCH /seller/cafe` also takes `coordinates: { latitude, longitude }` → the café with the new `coordinates`. 409 `cafe_busy` while an order is `received`, `preparing` or `on-the-way`; 400 for bad coordinates. A bad field changes nothing.
  - `GET /seller/menu` → the café's items in menu order, sold-out ones included (`MenuItem[]`).

- [ ] **Step 1: Failing tests:** `sell from here moves the stand, and range is measured from it` (move 1 km north; a new order from HERE gets 422 `out_of_range`), `sell from here is 409 cafe_busy while an order is unfinished`, `bad coordinates are 400 and change nothing`, `the seller's menu has every item of their café, sold out too`.
- [ ] **Step 2: Run** `npm test -w @shoot/server`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): sell from here, and the seller's menu`

### Task 2: Seller app: Menu tab and the item sheet

**Files:**
- Create: `apps/seller/src/app/(tabs)/menu.tsx`, `apps/seller/src/app/menu-item/[id].tsx`, `packages/shared/src/price.ts`, `packages/shared/test/price.test.ts`
- Modify: `apps/seller/src/app/(tabs)/_layout.tsx` (Menu between Orders and Stand, icon `cup`), `apps/seller/src/app/_layout.tsx` (`menu-item/[id]` as formSheet), `apps/seller/src/data/api.ts` (`getMenu`, `updateMenuItem(id, changes)`), `apps/seller/src/data/queries.ts` (`useMenu`, key `['seller-menu']`)

**Interfaces:**
- Produces:
  - `parsePriceInput(text: string): number | null`: "3,50" / "3.50" / "3.5" / "3" → 350 / 350 / 350 / 300; "", "abc", "-1", "3.555" → null.
  - `useMenu()`, `updateMenuItem(id: string, changes: { soldOut?: boolean; priceCents?: number; description?: string }): Promise<MenuItem>`.
  - Menu tab: items grouped by section (Coffee, Tea, Pastries, Lunch), each row: name, price, a `Switch` "Available" (off = sold out). The switch updates the cache at once (optimistic) and puts the server's answer back; on error it flips back and says so. Tapping the row opens the sheet.
  - Sheet `menu-item/[id]`: price field (`TextField`, decimal keyboard), description field (multiline, max 200), Save and Cancel.

- [ ] **Step 1: Failing test** `parsePriceInput` cases above (Review Focus 2). **Run**, expect FAIL; implement; **run**, expect PASS.
- [ ] **Step 2:** Implement the tab and the sheet.
- [ ] **Step 3: Run** `npm run check`, `npx expo lint`, typed routes + `npx tsc --noEmit`, `npx expo export --platform android`. Expected: PASS.
- [ ] **Step 4: Commit** `feat(seller): menu tab with sold out, prices and descriptions`

### Task 3: Seller app: Stand tab and "Sell from here"

**Files:**
- Create: `apps/seller/src/app/stand-location.tsx`
- Modify: `apps/seller/src/app/(tabs)/stand.tsx`, `apps/seller/src/app/_layout.tsx`, `apps/seller/src/data/api.ts` (`updateCafe(changes: { isPaused?: boolean; coordinates?: Coordinates }): Promise<Cafe>`), `packages/ui/src/components/delivery-map.tsx` (optional `onPress?: (coordinates: Coordinates) => void`), `README.md` (checklist)

**Interfaces:**
- Consumes: `PATCH /seller/cafe` (Task 1), `DeliveryMap`.
- Produces:
  - Stand tab: the café's name and phone; "Pause orders" `Switch` with the line "Customers see the café, but can’t order."; "Sell from here" button (secondary, icon `pin`); sign out. Pausing writes the server's café into `['seller-me']`.
  - `/stand-location`: gets the phone's position (asking for permission), shows the map with one place "Your stand" there; tapping the map moves the pin; "Sell from here" saves. While orders are unfinished the button is disabled with "Finish your open orders first." (the queue tells); a 409 `cafe_busy` shows the same line.

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Run** `npm run check`, lint, typed routes + tsc, Android export. Expected: PASS.
- [ ] **Step 3:** README checklist: pause, then the customer app refuses a new order; sold out, then the customer sees it sold out; a new price shows in the customer app; "Sell from here" moves the café on the customer's map and its range.
- [ ] **Step 4: Commit** `feat(seller): stand tab with pause and sell from here`
