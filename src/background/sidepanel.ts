/**
 * sidepanel.ts
 *
 * Manages the UI display mode (sidepanel ↔ popup) for the extension.
 *
 * Implements a queue for sidePanel.open() which requires a user gesture.
 * When user gesture is unavailable, requests are queued and processed
 * on the next available gesture (e.g., icon click).
 */

import type { UiMode, SetUiModeResponse } from '@/messages/types';

const STORAGE_KEY = 'uiMode';
const DEFAULT_MODE: UiMode = 'sidepanel';
const PANEL_PATH = 'src/popup/index.html';

// Queue for sidePanel.open() requests that require user gesture
let sidePanelOpenQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;
let queuedRequestCount = 0;

// Track the popup window opened as sidepanel fallback
let dappPopupWindowId: number | null = null;

function readStoredMode(): Promise<UiMode> {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_MODE }, (res) => {
      resolve(res[STORAGE_KEY] as UiMode);
    });
  });
}

function storeMode(mode: UiMode): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: mode }, resolve);
  });
}

function applyPanelBehavior(mode: UiMode): void {
  const openPanelOnActionClick = mode === 'sidepanel';

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick })
    .catch((e) => console.warn('[sidepanel] setPanelBehavior failed:', e));

  chrome.sidePanel
    .setOptions({ enabled: mode === 'sidepanel', path: PANEL_PATH })
    .catch((e) => console.warn('[sidepanel] setOptions failed:', e));
}

/**
 * Update badge to show number of queued zkApp requests
 */
function notifySidePanelQueue(): void {
  const count = sidePanelOpenQueue.length + queuedRequestCount;

  if (count > 0) {
    const badgeText = count > 9 ? '9+' : String(count);
    chrome.action
      .setBadgeText({ text: badgeText })
      .catch((e) => console.warn('[sidepanel] setBadgeText failed:', e));

    chrome.action
      .setBadgeBackgroundColor({ color: '#EA6D20' }) // Orange-red
      .catch((e) =>
        console.warn('[sidepanel] setBadgeBackgroundColor failed:', e),
      );
  } else {
    // Clear badge when queue is empty
    chrome.action
      .setBadgeText({ text: '' })
      .catch((e) => console.warn('[sidepanel] clearBadge failed:', e));
  }
}

async function broadcastCloseView(): Promise<void> {
  await chrome.runtime.sendMessage({ type: 'CLOSE_VIEW' }).catch(() => {
    // Ignore if no extension view is currently listening.
  });

  const extensionOrigin = chrome.runtime.getURL('');
  const windows = await chrome.windows.getAll({ populate: true });
  const popoutWindowIds = windows
    .filter(
      (win) =>
        win.type === 'popup' &&
        win.tabs?.some((tab) => tab.url?.startsWith(extensionOrigin)),
    )
    .map((win) => win.id!)
    .filter((id) => id !== chrome.windows.WINDOW_ID_NONE);

  await Promise.all(
    popoutWindowIds.map((id) => chrome.windows.remove(id).catch(() => {})),
  );
}

/**
 * Process queued sidePanel.open() requests
 * These require a user gesture, so they're queued when unavailable
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || sidePanelOpenQueue.length === 0) {
    // Clear badge when processing queue (or if queue is empty)
    queuedRequestCount = 0;
    notifySidePanelQueue();
    return;
  }

  isProcessingQueue = true;

  while (sidePanelOpenQueue.length > 0) {
    const request = sidePanelOpenQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        // Log but don't throw - let other queued requests process
        console.warn('[sidepanel] Queued operation failed:', error);
      }
    }
  }

  isProcessingQueue = false;
  queuedRequestCount = 0;
  notifySidePanelQueue();
}

async function openDappPopup(): Promise<void> {
  // Focus existing popup if still open
  if (dappPopupWindowId !== null) {
    try {
      await chrome.windows.update(dappPopupWindowId, { focused: true });
      return;
    } catch {
      dappPopupWindowId = null;
    }
  }

  // chrome.windows.create() does NOT require a user gesture — safe to call
  // from a service worker event triggered by a content script message.
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL(PANEL_PATH),
    type: 'popup',
    width: 400,
    height: 630,
    focused: true,
  });

  const winId = win?.id;
  if (winId !== undefined) {
    dappPopupWindowId = winId;
    chrome.windows.onRemoved.addListener(function cleanup(windowId) {
      if (windowId === winId) {
        dappPopupWindowId = null;
        chrome.windows.onRemoved.removeListener(cleanup);
      }
    });
  }
}

const DAPP_NOTIFICATION_ID = 'clorio_dapp_request';

function showDappRequestNotification(): void {
  chrome.notifications.create(DAPP_NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: 'icon-48.png',
    title: 'Clorio Connect',
    message: 'A dApp is requesting access. Click to open the wallet.',
    priority: 2,
  });
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === DAPP_NOTIFICATION_ID) {
    chrome.notifications.clear(DAPP_NOTIFICATION_ID);
    processQueue().catch((e) =>
      console.warn('[sidepanel] processQueue from notification failed:', e),
    );
  }
});

async function openSidePanel(): Promise<void> {
  let targetWindowId: number | undefined;

  try {
    const focused = await chrome.windows.getLastFocused({
      windowTypes: ['normal'],
    });
    targetWindowId = focused.id;
  } catch {
    const [first] = await chrome.windows.getAll({ windowTypes: ['normal'] });
    targetWindowId = first?.id;
  }

  if (targetWindowId === undefined) {
    console.warn('[sidepanel] No normal window found to open sidepanel in.');
    return;
  }

  try {
    await chrome.sidePanel.open({ windowId: targetWindowId });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // sidePanel.open() requires a user gesture — open a popup as immediate
    // fallback (chrome.windows.create does not require a gesture).
    if (errorMsg.includes('user gesture')) {
      sidePanelOpenQueue.push(async () => {
        await chrome.sidePanel.open({ windowId: targetWindowId });
      });
      queuedRequestCount++;
      notifySidePanelQueue();
      await openDappPopup().catch(() => {
        // If popup also fails, fall back to badge + notification
        showDappRequestNotification();
      });
    } else {
      console.warn('[sidepanel] sidePanel.open() failed:', error);
    }
  }
}

async function switchMode(next: UiMode): Promise<void> {
  console.log(`[sidepanel] Switching to mode: ${next}`);

  await storeMode(next);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await broadcastCloseView();

  applyPanelBehavior(next);

  if (next === 'sidepanel') {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await openSidePanel();
  }

  console.log(`[sidepanel] Mode switch complete: ${next}`);
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await storeMode(DEFAULT_MODE);
    applyPanelBehavior(DEFAULT_MODE);
  } else {
    const stored = await readStoredMode();
    applyPanelBehavior(stored);
  }
});

/**
 * Listen for user gestures to trigger queued sidePanel operations
 */
chrome.runtime.onMessage.addListener(() => {
  processQueue().catch((error) => {
    console.error('[sidepanel] processQueue failed:', error);
  });
});

/**
 * Listen for extension icon click to process queued sidepanel opens
 */
chrome.action.onClicked.addListener(() => {
  processQueue().catch((error) => {
    console.error('[sidepanel] processQueue from action click failed:', error);
  });
});

async function hasOpenExtensionView(): Promise<boolean> {
  // chrome.runtime.getContexts is MV3-native and works in service workers.
  // chrome.extension.getViews() is unavailable in service workers (MV3).
  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['SIDE_PANEL', 'POPUP', 'TAB'] as chrome.runtime.ContextType[],
    });
    return contexts.length > 0;
  }
  return dappPopupWindowId !== null;
}

export async function openExtension(): Promise<void> {
  // If any extension view is already open (sidepanel, popup, or our fallback
  // popup window), the DAPP_APPROVAL_REQUESTED_MESSAGE sent by enqueueApproval
  // will navigate it — no need to open a new window.
  if (await hasOpenExtensionView()) {
    return;
  }

  const mode = await readStoredMode();
  if (mode === 'sidepanel') {
    applyPanelBehavior('sidepanel');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await openSidePanel();
  } else if (chrome.action?.openPopup) {
    try {
      await chrome.action.openPopup();
    } catch (error) {
      console.warn('[sidepanel] openPopup() failed:', error);
      // Graceful degradation - silently fail if popup can't open
    }
  }
}

export function handleSetUiMode(
  value: UiMode,
  _senderTabId: number | undefined,
  sendResponse: (r: SetUiModeResponse) => void,
): void {
  sendResponse({ ok: true });

  switchMode(value).catch((err) => {
    console.error('[sidepanel] switchMode failed:', err);
  });
}
