import { useState, useEffect } from 'react';

export type UiMode = 'popup' | 'sidepanel';

export function useSidePanelMode() {
  const [uiMode, setUiMode] = useState<UiMode>('sidepanel');

  useEffect(() => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get({ uiMode: 'sidepanel' }, (res) => {
        setUiMode(res.uiMode as UiMode);
      });
    }
  }, []);

  async function updateMode(next: UiMode) {
    setUiMode(next);

    if (chrome?.runtime?.sendMessage) {
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ type: 'SET_UIMODE', value: next }, () =>
          resolve(),
        );
      });
    }

    try {
      const currentWindow = await chrome.windows.getCurrent();

      if (next === 'sidepanel') {
        if (chrome.sidePanel && chrome.sidePanel.open && currentWindow.id) {
          await chrome.sidePanel.open({ windowId: currentWindow.id });
          window.close();
        }
      } else {
        if (chrome.action && chrome.action.openPopup) {
          await chrome.action.openPopup();
          window.close();
        }
      }
    } catch (error) {
      console.error('Failed to switch mode:', error);
    }
  }

  return { uiMode, updateMode };
}
