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
}

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

    // If error is due to missing user gesture, queue for later
    if (errorMsg.includes('user gesture')) {
      console.warn('[sidepanel] queued for next user gesture');
      sidePanelOpenQueue.push(async () => {
        console.log('[sidepanel] executing queued open request');
        await chrome.sidePanel.open({ windowId: targetWindowId });
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

export async function openExtension(): Promise<void> {
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
