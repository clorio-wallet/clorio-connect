# Notification Management and i18n Roadmap

**Branch:** `feat/notifications-i18n`
**Scope:** Clorio Connect browser-extension notification work only.

## Goal

Replace notification badge fallbacks with native browser notifications and make notification copy available in the wallet's existing English, Spanish, French, and German locales.

## Current state

- The background service worker already has the `notifications` permission and emits one hard-coded dApp-request notification.
- Queued dApp requests still use an action badge as the primary indicator and as a fallback.
- Session locking/unlocking is owned by the UI session store, so the background must receive lifecycle events.
- Transaction status polling currently runs in open React views; it does not notify when the wallet UI is closed.
- UI translations already use i18next with bundled `en`, `es`, `fr`, and `de` resources.

## Delivery milestones

**Status:** Implemented on `feat/notifications-i18n`.

### 1. Notification foundation

- Add a typed runtime-message contract for native notifications, transaction watches, and language synchronization.
- Centralize notification IDs, payload validation, and notification creation in the background service worker.
- Keep notification failures non-fatal and log them without interrupting wallet behavior.

### 2. Native dApp request notifications

- Remove action-badge updates from the side-panel request queue.
- Use a localized native notification when the request cannot immediately open a wallet view.
- Preserve click handling so clicking the notification processes the queued request.

### 3. Transaction-update notifications

- Register successful payment and delegation broadcasts for background tracking.
- Persist tracked hash, address, network, and transaction type in `chrome.storage.local`.
- Poll tracked transactions from a repeating `chrome.alarms` alarm.
- Notify once when a tracked transaction becomes `applied` or `failed`, then remove it from the watch list.
- Avoid exposing secrets or full addresses in notification text.

### 4. Session lifecycle notifications

- Emit native notifications for real lock and unlock transitions.
- Cover manual logout, auto-lock, and successful unlock without notifying on ordinary session restoration.
- Keep the existing secure session-storage behavior unchanged.

### 5. Software-update notification

- Emit a localized notification from `runtime.onInstalled` when `details.reason === 'update'`.
- Do not notify on first install.

### 6. i18n support

- Add notification keys to all four existing locale files.
- Synchronize the selected UI language to extension storage for service-worker notifications.
- Use English fallback when a locale is unavailable or a translation key is missing.
- Do not refactor unrelated application translations.

## Verification

- `npm test`: 19 tests passed.
- `npm run build`: passed.
- `npm run build:firefox`: passed.
- Focused ESLint on new/notification files: passed.
- `npx tsc --noEmit`: existing unrelated errors remain in `src/api/axios-instance.ts`, `src/components/wallet/transaction-list.tsx`, and `src/inpage/provider.ts`.

## Acceptance criteria

- No notification queue uses `chrome.action.setBadgeText` or `setBadgeBackgroundColor`.
- dApp requests, transaction terminal updates, lock/unlock transitions, and extension updates use native browser notifications.
- Transaction notifications work after the popup/sidepanel is closed.
- Each notification is localized in `en`, `es`, `fr`, and `de`, with English fallback.
- Duplicate transaction status notifications are not emitted.
- All notification payloads are typed and validated at the runtime boundary.
- New behavior has focused unit tests; the existing baseline build failure is either resolved by the notification changes or reported separately.

## Explicitly out of scope

- Redesigning the wallet UI notification/toast system.
- Reworking existing non-notification i18n coverage or translating unrelated hard-coded UI copy.
- Push notifications, remote notification servers, or mobile-wallet clients.
- Changes to transaction APIs unrelated to status observation.
- Dependency upgrades or unrelated build cleanup.
