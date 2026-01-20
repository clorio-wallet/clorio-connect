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
          try {
            await chrome.sidePanel.open({ windowId: currentWindow.id });
          } catch (e) {
            console.warn('Could not open sidepanel automatically:', e);
          }
          window.close();
        }
      } else {
        if (chrome.action && chrome.action.openPopup) {
          try {
            await chrome.action.openPopup();
          } catch (e) {
            console.warn('Could not open popup automatically:', e);
          }
          window.close();
        }
      }
    } catch (error) {
      console.error('Failed to switch mode:', error);
    }
  }

  return { uiMode, updateMode };
}
