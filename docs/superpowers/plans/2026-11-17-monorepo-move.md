# Monorepo move implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `location-based-app` repo into the `shoot` monorepo (`apps/customer`, `server`, `packages/shared`) with the customer app working exactly as before.

**Architecture:** npm workspaces at the repo root. The existing app moves to `apps/customer` with `git mv` so history follows. The test server stays at `server/` as its own workspace. A new `packages/shared` workspace holds the app's data types as the first shared code. Expo SDK 52+ configures Metro for workspaces by itself, so no `metro.config.js` is needed.

**Tech Stack:** npm workspaces, Expo SDK 58 (Metro auto monorepo support), TypeScript 6, Node 26.

**Spec:** `docs/superpowers/specs/2026-11-17-shoot-system-design.md` (section "Repository and git", build-order step 1).

## Global Constraints

- One `.git` at the repo root. No `.git` in any subfolder.
- Every move of a tracked file uses `git mv`, so `git log --follow` keeps its history.
- Package installs are run by the owner, not by Claude (`CLAUDE.md`). Steps marked **(owner)** wait for the owner to run the command and paste or confirm the result.
- Claude may do all git actions: branches, moves, commits. Pushing and renaming the GitHub repo are the owner's.
- Never edit `ios/` or `android/` by hand. They are generated and ignored by git.
- The customer app's behaviour must not change in this plan. No feature work.
- Run `npm run fix`, `npx tsc --noEmit` and `npx expo lint` in `apps/customer` before calling a task done.
- Workspace names: root `shoot`, app `@shoot/customer`, server `@shoot/server`, shared `@shoot/shared`.

## Review Focus

1. Two copies of `react` or `react-native` after the install (an old `node_modules` left inside the app folder). Expected: `npm why react-native` lists one version. Checked in Task 3.
2. Metro can't resolve `@shoot/shared`, whose entry is a `.ts` file. Expected: an iOS bundle exports without errors. Checked in Task 4.
3. File history lost because a file was moved with plain `mv`. Expected: `git log --follow apps/customer/src/app/_layout.tsx` shows commits from before the move. Checked in Task 2.
4. The `@/` and `@/assets/` path aliases break after the move. Expected: `tsc` passes and the bundle exports. Checked in Tasks 3 and 4.
5. Claude's memory for this project is keyed to the folder path, so the rename hides it from the next session. Expected: the memory files exist under the new key after Task 5.

---

### Task 1: Commit the open work

**Files:** everything currently modified or untracked in `location-based-app` (see `git status`): the test server in `server/`, the app's switch to the real API, sign-in, E1/E4/E6, the design spec and this plan.

- [ ] **Step 1: Check the app before committing**

Run in `location-based-app`: `npx tsc --noEmit && npx expo lint && npx tsc --noEmit -p server`
Expected: no output from tsc, lint exits 0.

- [ ] **Step 2: Commit on `feature/ordering-flow` in three commits**

```bash
git add server tsconfig.json eslint.config.js
git commit -m "feat: add test server (Node, SQLite, no dependencies)"
git add src
git commit -m "feat: use the test server; sign-in, E1, E4, E6 edge cases"
git add docs
git commit -m "docs: system design and monorepo move plan"
```

Expected: `git status` reports a clean tree. End each commit message with the attribution line from the session's system reminder.

### Task 2: Move the app into `apps/customer`

**Files:**
- Move (git mv) to `apps/customer/`: `app.json`, `assets/`, `src/`, `scripts/`, `eslint.config.js`, `tsconfig.json`, `package.json`, `AGENTS.md`
- Stay at the root: `.claude/`, `.gitignore`, `.prettierrc`, `.vscode/`, `CLAUDE.md`, `LICENSE`, `README.md`, `docs/`, `server/`, `package-lock.json`
- Delete (untracked, regenerated): `node_modules/`, `.expo/`, `ios/`, `expo-env.d.ts`
- Create: `package.json` (root), `apps/customer/CLAUDE.md`
- Modify: `CLAUDE.md`, `README.md`, `apps/customer/tsconfig.json`, `apps/customer/eslint.config.js`, `apps/customer/package.json`, `server/package.json`

**Interfaces:**
- Produces: root `package.json` with `"workspaces": ["apps/*", "packages/*", "server"]`; workspace names from Global Constraints.

- [ ] **Step 1: Create the branch**

Run: `git switch -c chore/monorepo`

- [ ] **Step 2: Delete the generated folders**

Run: `rm -rf node_modules .expo ios expo-env.d.ts`
Why: `ios/` and `node_modules/` contain absolute and relative paths to the old location. Expo regenerates `ios/` on the next `npx expo run:ios`, and `expo-env.d.ts` on the next `npx expo start`.

- [ ] **Step 3: Move the tracked app files**

```bash
mkdir -p apps/customer
git mv app.json assets src scripts eslint.config.js tsconfig.json package.json AGENTS.md apps/customer/
```

Expected: `git status` shows only renames (`R`), no deletes plus adds.

- [ ] **Step 4: Write the root `package.json`**

`{ "name": "shoot", "private": true, "workspaces": ["apps/*", "packages/*", "server"], "scripts": { "check": "npm run check --workspaces --if-present" } }`

- [ ] **Step 5: Rename the workspaces and remove the old server exclusions**

- `apps/customer/package.json`: `"name": "@shoot/customer"`. Keep all scripts; its `check` script already exists.
- `server/package.json`: `"name": "@shoot/server"`; add `"check": "npm run types:check"`.
- `apps/customer/tsconfig.json`: remove `"exclude"` with `server` (the server is no longer inside the app folder). Keep `paths` as they are; they are relative to this file.
- `apps/customer/eslint.config.js`: remove `'server/*'` from `ignores`.

- [ ] **Step 6: Split `CLAUDE.md`**

- Root `CLAUDE.md`: the "Working agreement" section unchanged, plus a short "Repository layout" section listing `apps/customer`, `apps/seller` (planned), `server`, `packages/shared`, and the rule "run `npx expo install` inside the app's folder, not at the root".
- `apps/customer/CLAUDE.md`: the Expo part of the old `CLAUDE.md` (from the top through "## Rules").

- [ ] **Step 7: Replace `README.md`**

Short: what Shoot is, the layout, and how to run the server (`npm run dev -w @shoot/server`) and the customer app (`cd apps/customer && npx expo start`).

- [ ] **Step 8: Check history**

Run: `git log --follow --oneline apps/customer/src/app/_layout.tsx | tail -3`
Expected: commits from before today, such as `f1c98b0 feat: introduce useQuery; tabs from design;` or older.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: move the customer app to apps/customer (npm workspaces)"
```

### Task 3: Install and check the moved app

**Files:** `package-lock.json` (rewritten by npm).

- [ ] **Step 1 (owner): Install at the root**

Run in the repo root: `npm install`
Expected: no `ERESOLVE` errors. Warnings about peer dependencies are acceptable if Step 2 passes.

- [ ] **Step 2: One React Native**

Run: `npm why react-native | head -5` and `npm why react | grep -c '^react@'`
Expected: a single `react-native@0.88.1`, and one `react@19.3.0` version.

- [ ] **Step 3: Checks in the app folder**

Run in `apps/customer`: `npx expo-doctor`, `npx tsc --noEmit`, `npx expo lint`
Expected: doctor reports no monorepo or duplicate-module problems; tsc and lint pass.

- [ ] **Step 4: Server check**

Run in the root: `npm run check -w @shoot/server`
Expected: exits 0.

- [ ] **Step 5: Commit the lockfile**

```bash
git add package-lock.json
git commit -m "chore: workspace lockfile"
```

### Task 4: Create `packages/shared` with the data types

**Files:**
- Move (git mv): `apps/customer/src/data/types.ts` → `packages/shared/src/types.ts`
- Create: `packages/shared/package.json`, `packages/shared/src/index.ts`, `packages/shared/tsconfig.json`
- Modify: every file in `apps/customer/src` that imports from `@/data/types`; `apps/customer/package.json`

**Interfaces:**
- Produces: package `@shoot/shared`, entry `src/index.ts`, which re-exports every type from `./types` (`Coordinates`, `CafeCategory`, `Cafe`, `MenuSection`, `MenuItem`, `Spot`, `OrderLine`, `OrderStatus`, `Order`). Later plans add the API client, theme and components here.

- [ ] **Step 1: Write a failing check**

Change one import, `apps/customer/src/data/queries.ts`: `from '@/data/types'` → `from '@shoot/shared'`.
Run: `npx tsc --noEmit` in `apps/customer`.
Expected: FAIL, "Cannot find module '@shoot/shared'".

- [ ] **Step 2: Create the package**

- `packages/shared/package.json`: `{ "name": "@shoot/shared", "version": "0.0.0", "private": true, "main": "src/index.ts", "types": "src/index.ts", "scripts": { "check": "tsc --noEmit -p ." } }`
- `git mv apps/customer/src/data/types.ts packages/shared/src/types.ts`
- `packages/shared/src/index.ts`: `export type * from './types';`
- `packages/shared/tsconfig.json`: `strict`, `noEmit`, `module`/`moduleResolution` `"bundler"`, `include: ["src"]`.
- `apps/customer/package.json`: add `"@shoot/shared": "*"` to `dependencies`.

- [ ] **Step 3: Update the remaining imports**

Every `from '@/data/types'` in `apps/customer/src` becomes `from '@shoot/shared'`. Keep `import type` where it was.

- [ ] **Step 4 (owner): Link the new workspace**

Run in the root: `npm install`
Expected: `node_modules/@shoot/shared` is a link to `packages/shared`.

- [ ] **Step 5: Type, lint and bundle checks**

Run in `apps/customer`: `npm run fix && npx tsc --noEmit && npx expo lint`
Then: `npx expo export --platform ios --output-dir <scratchpad>/export-check`
Expected: all pass; the export prints "Exported" with no "Unable to resolve" errors. The output folder is outside the repo.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: packages/shared with the data types"
```

### Task 5: Rename the folder and hand over

**Files:** the folder `software-project/location-based-app` → `software-project/shoot`; Claude memory under `~/.claude/projects/`.

- [ ] **Step 1: Copy Claude's project memory to the new path key**

Copy `~/.claude/projects/-Users-stanley-Documents-school-2-software-project-location-based-app/memory/` to `~/.claude/projects/-Users-stanley-Documents-school-2-software-project-shoot/memory/`.
Expected: `MEMORY.md` and every memory file exist in the new folder.

- [ ] **Step 2: Rename the folder**

Run from `software-project/`: `mv location-based-app shoot`
Expected: `git -C shoot status` is clean and on `chore/monorepo`.

- [ ] **Step 3 (owner): Run the app and the server**

- `npm run dev -w @shoot/server` in `shoot/`
- `npx expo start --clear` in `shoot/apps/customer`, then open the app on the iPhone
Expected: sign-in with `123456`, café list, an order placed, and the order in Orders, as before the move.

- [ ] **Step 4 (owner): Outside steps**

- Restart Claude Code from `software-project/shoot`.
- Rename the GitHub repo to `shoot` in its settings, then run `git remote set-url origin https://github.com/stanleyrihak/shoot.git`.
- Reopen the project in WebStorm from the new folder.
- Merge `chore/monorepo` when Step 3 works.
