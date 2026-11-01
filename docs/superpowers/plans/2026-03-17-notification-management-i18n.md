# Notification Management and i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver native, localized Clorio Connect notifications for dApp requests, transaction status updates, session lifecycle events, and extension updates while keeping the change limited to notification behavior.

**Architecture:** The service worker owns native notification creation, localized catalog lookup, transaction-watch persistence, and alarm-driven polling. UI contexts send typed runtime messages for session events, successful broadcasts, and language changes; the service worker handles them without exposing secrets. Existing i18next resources remain the source of notification copy for all four supported locales.

**Tech Stack:** TypeScript, Chrome/Firefox Manifest V3 APIs, `chrome.notifications`, `chrome.alarms`, `chrome.storage.local`, i18next, Vitest.

**Spec:** `docs/notification-management-i18n-roadmap.md`

## Global Constraints

- Scope is notification behavior only; do not refactor unrelated wallet or i18n code.
- Use native browser notifications instead of action badges for notification delivery.
- Transaction notifications must continue when the popup/sidepanel is closed.
- Support `en`, `es`, `fr`, and `de`, with English fallback.
- Persist no secrets and do not include full wallet addresses in notification copy.
- Validate runtime message payloads at the service-worker boundary.
- Follow TDD: each new pure behavior gets a failing test before production implementation.
- Preserve the known baseline Vite `react-hook-form` entry-resolution failure unless notification changes fix it incidentally.

---

### Task 1: Typed notification contracts and localized resources

**Files:**
- Modify: `src/messages/types.ts`
- Modify: `src/i18n.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/es.json`
- Modify: `src/locales/fr.json`
- Modify: `src/locales/de.json`
- Modify: `package.json`
- Create: `tests/notifications/notification-types.test.ts`

**Interfaces:**
- Add message types for `SHOW_NATIVE_NOTIFICATION`, `TRACK_TRANSACTION`, `SESSION_LOCKED`, `SESSION_UNLOCKED`, and `LANGUAGE_CHANGED`.
- A tracked transaction contains `{ hash, address, apiUrl, networkId, type }`, where `type` is `payment | delegation | zkapp`.
- A notification request contains a stable `id`, localized `title`, localized `message`, and optional `priority`.
- Add `clorio_language` storage synchronization from i18next language changes.

- [ ] **Step 1: Write the failing test**

Test that the notification message union accepts the exact transaction and lifecycle payload shapes and that a transaction identity is stable for the same hash/network pair.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tests/notifications/notification-types.test.ts`
Expected: FAIL because the new notification contract and identity helper do not exist.

- [ ] **Step 3: Implement the minimum contracts and language sync**

Add the message types and `NotificationTransaction` interface to `src/messages/types.ts`. Add notification translation keys for dApp requests, transaction applied/failed, session locked/unlocked, and software update to all four locale files. Configure supported locales/fallback explicitly and persist the normalized selected language under `clorio_language` when `changeLanguage` fires. Add a `test` script using `vitest run` if the package does not already expose one.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/notifications/notification-types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/messages/types.ts src/i18n.ts src/locales package.json tests/notifications/notification-types.test.ts
git commit -m "feat: add notification contracts and translations"
```

---

### Task 2: Background notification service and dApp badge replacement

**Files:**
- Create: `src/background/notifications.ts`
- Modify: `src/background/index.ts`
- Modify: `src/background/sidepanel.ts`
- Create: `tests/notifications/notification-service.test.ts`
- Modify: `src/manifest.json`
- Modify: `src/manifest.firefox.json`

**Interfaces:**
- Export `registerNotificationHandlers(): void` for service-worker initialization.
- Export a pure `notificationId(kind: string, key: string): string` helper.
- Handle typed runtime messages and call `chrome.notifications.create` with `iconUrl: 'icon-48.png'`.

- [ ] **Step 1: Write failing service tests**

Test localized catalog fallback, stable IDs, and validation rejection for a malformed runtime notification request. Test that a dApp request notification uses the localized title/message rather than an action badge.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/notifications/notification-service.test.ts`
Expected: FAIL because the background notification service does not exist.

- [ ] **Step 3: Implement the service**

Create a background-only service that loads the four bundled locale resources, normalizes stored language values, falls back to English, validates incoming message objects, and creates native notifications. Preserve the existing dApp notification click behavior and route transaction/session/update notification clicks to the extension view when appropriate. Add the `alarms` permission to both manifests. Import/register the service from `src/background/index.ts`.

Remove `notifySidePanelQueue`, all `chrome.action.setBadgeText`/`setBadgeBackgroundColor` calls, and badge-related fallback comments from `sidepanel.ts`. Show the native dApp request notification when a request is queued instead.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/notifications/notification-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the relevant TypeScript bundle**

Run: `npm run build`
Expected: the pre-existing `react-hook-form` resolution failure may remain; no new notification TypeScript error should appear before that resolver failure.

- [ ] **Step 6: Commit**

```bash
git add src/background/notifications.ts src/background/index.ts src/background/sidepanel.ts src/manifest.json src/manifest.firefox.json tests/notifications/notification-service.test.ts
git commit -m "feat: replace notification badges with native notifications"
```

---

### Task 3: Background transaction-watch polling

**Files:**
- Modify: `src/background/notifications.ts`
- Modify: `src/background/index.ts`
- Modify: `src/background/handlers/dapp.ts`
- Modify: `src/background/handlers/ledger.ts`
- Modify: `src/hooks/use-send-transaction.ts`
- Modify: `src/hooks/use-delegate-transaction.ts`
- Create: `tests/notifications/transaction-watch.test.ts`

**Interfaces:**
- `registerTransactionWatch(input: NotificationTransaction): Promise<void>` persists a de-duplicated watch.
- `pollTransactionWatches(fetcher?: TransactionStatusFetcher): Promise<void>` reads watches, fetches `/v1/mina/transaction/<hash>`, emits one terminal notification, and removes completed watches.
- `TransactionStatusFetcher` receives `{ apiUrl, hash }` and returns `{ status: 'pending' | 'applied' | 'failed' }`.

- [ ] **Step 1: Write failing transition tests**

Cover: pending remains watched without notification; applied emits exactly one notification and removes the watch; failed emits exactly one notification and removes the watch; repeated polling does not duplicate terminal notifications; malformed/failed fetches remain watched for a later retry.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/notifications/transaction-watch.test.ts`
Expected: FAIL because watch persistence and polling do not exist.

- [ ] **Step 3: Implement storage and alarm polling**

Store watches under a single namespaced local-storage key. On service-worker startup and install, create a repeating alarm with a one-minute period. On the alarm, poll each watch using its stored API base URL and URL-encode the hash. Notify using only a short transaction label/hash prefix and localized terminal copy. Delete only after `applied` or `failed`; leave transient network/API failures for retry.

- [ ] **Step 4: Register all successful broadcasts**

After successful payment/delegation broadcasts in UI hooks, send a `TRACK_TRANSACTION` message with the active network API URL. Register direct dApp and Ledger background broadcasts at their existing success boundaries too, so all supported client paths are covered.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run tests/notifications/transaction-watch.test.ts tests/notifications/notification-service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/background src/hooks tests/notifications/transaction-watch.test.ts
git commit -m "feat: notify on transaction status updates"
```

---

### Task 4: Session-lock and unlock notifications

**Files:**
- Modify: `src/stores/session-store.ts`
- Modify: `src/pages/wallet-unlock.tsx`
- Modify: `src/pages/DappApproval.tsx`
- Create: `tests/notifications/session-notifications.test.ts`

**Interfaces:**
- Add small internal helpers `notifySessionLocked()` and `notifySessionUnlocked()` that send the corresponding typed runtime message and swallow unavailable-runtime errors.

- [ ] **Step 1: Write failing tests**

Test that an explicit logout and auto-lock each emit a lock event, while a successful password unlock emits one unlock event. Test that restoring an already-valid session does not emit a new unlock notification.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/notifications/session-notifications.test.ts`
Expected: FAIL because lifecycle notifications are not wired.

- [ ] **Step 3: Implement lifecycle wiring**

Emit lock only after the current authenticated session is cleared by logout or auto-lock. Emit unlock only after password validation succeeds in both wallet unlock entry points. Keep session storage, wallet reset, and navigation logic unchanged.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run tests/notifications/session-notifications.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/session-store.ts src/pages/wallet-unlock.tsx src/pages/DappApproval.tsx tests/notifications/session-notifications.test.ts
git commit -m "feat: notify on wallet session changes"
```

---

### Task 5: Software-update event, full verification, and roadmap closeout

**Files:**
- Modify: `src/background/index.ts`
- Modify: `docs/notification-management-i18n-roadmap.md`
- Modify: `docs/superpowers/plans/2026-03-17-notification-management-i18n.md`

- [ ] **Step 1: Write the failing update-event test**

Test that an `onInstalled` update reason creates one localized update notification and an install reason creates none.

- [ ] **Step 2: Run it and verify failure**

Run: `npx vitest run tests/notifications/update-notification.test.ts`
Expected: FAIL because update handling is not wired.

- [ ] **Step 3: Implement update handling**

Add an update-only branch to the existing installation listener. Use the background service’s localized notification path and do not modify install initialization behavior.

- [ ] **Step 4: Run all notification tests**

Run: `npx vitest run tests/notifications`
Expected: PASS with zero failures.

- [ ] **Step 5: Run lint and build verification**

Run: `npm run lint` and `npm run build`.
Expected: lint passes; build either passes or reports only the documented pre-existing `react-hook-form` resolution failure.

- [ ] **Step 6: Verify scope and update roadmap**

Run: `git diff --check`, `git status --short`, and `git diff --stat HEAD~N..HEAD`.
Confirm no badge APIs remain in notification paths, all four locale files contain the notification keys, and only notification-related source/config/docs changed. Mark completed milestones and record any baseline build limitation in the roadmap.

- [ ] **Step 7: Commit**

```bash
git add docs/notification-management-i18n-roadmap.md docs/superpowers/plans/2026-03-17-notification-management-i18n.md src/background/index.ts tests/notifications/update-notification.test.ts
git commit -m "docs: close notification management roadmap"
```
