import { useState, useEffect } from 'react';
import type { UiMode } from '@/messages/types';

export type { UiMode };

const STORAGE_KEY = 'uiMode';
const DEFAULT_MODE: UiMode = 'sidepanel';

export function useSidePanelMode() {
  const [uiMode, setUiMode] = useState<UiMode>(DEFAULT_MODE);

  useEffect(() => {
    chrome.storage.local.get({ [STORAGE_KEY]: DEFAULT_MODE }, (res) => {
      setUiMode(res[STORAGE_KEY] as UiMode);
    });
  }, []);

  async function updateMode(next: UiMode): Promise<void> {
    setUiMode(next);

    try {
      await chrome.runtime.sendMessage({ type: 'SET_UIMODE', value: next });
    } catch (err) {
      console.error('[use-side-panel-mode] SET_UIMODE failed:', err);
    }
  }

  return {
    uiMode,
    updateMode,
    isPopup: uiMode === 'popup',
  };
}
