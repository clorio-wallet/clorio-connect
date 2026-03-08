/**
 * sidepanel.ts
 *
 * Manages the UI display mode (sidepanel ↔ popup) for the extension.
 */

import type { UiMode, SetUiModeResponse } from '@/messages/types';

const STORAGE_KEY = 'uiMode';
const DEFAULT_MODE: UiMode = 'sidepanel';
const PANEL_PATH = 'src/popup/index.html';

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

  await chrome.sidePanel
    .open({ windowId: targetWindowId })
    .catch((e) => console.warn('[sidepanel] sidePanel.open() failed:', e));
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

export async function openExtension(): Promise<void> {
  const mode = await readStoredMode();
  if (mode === 'sidepanel') {
    applyPanelBehavior('sidepanel');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await openSidePanel();
  } else if (chrome.action?.openPopup) {
    await chrome.action
      .openPopup()
      .catch((e) => console.warn('[sidepanel] openPopup() failed:', e));
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
