import React, { useState, useEffect, useRef } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '@/lib/query-client';
import { useNetworkStore } from '@/stores/network-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useSessionStore } from '@/stores/session-store';
import { CacheCleaner } from '@/components/cache-cleaner';
import { QueryRestorationBoundary } from '@/components/query-restoration-boundary';
import { DAPP_NETWORK_ID_STORAGE_KEY } from '@/lib/dapp';
import {
  APP_CUSTOM_NETWORKS_STORAGE_KEY,
  DAPP_CUSTOM_NETWORKS_STORAGE_KEY,
} from '@/lib/networks';
import { storage } from '@/lib/storage';
import { PopupRoutes } from './PopupRoutes';

const App: React.FC = () => {
  const { fetchNetworks, syncCustomNetworks } = useNetworkStore();
  const setNetworkId = useSettingsStore((state) => state.setNetworkId);
  const { restoreSession } = useSessionStore();
  const networkId = useSettingsStore((state) => state.networkId);
  const [isRestored, setIsRestored] = useState(false);
  // Track whether we've already started closing to avoid double-close races.
  const isClosingRef = useRef(false);

  useEffect(() => {
    // Initialize cache and fetch networks
    const init = async () => {
      await restoreSession();
      const storedNetworkId = await storage.get<string>(DAPP_NETWORK_ID_STORAGE_KEY);
      if (storedNetworkId) {
        setNetworkId(storedNetworkId);
      }
      await syncCustomNetworks();
      await fetchNetworks();
      setIsRestored(true);
    };

    init();
  }, [fetchNetworks, restoreSession, setNetworkId, syncCustomNetworks]);

  // Listen for CLOSE_VIEW broadcast from the background service worker.
  // This is fired when the user switches UI modes (popup ↔ sidepanel) so that
  // all currently-open extension views close themselves — the background cannot
  // close popup/sidepanel pages directly via any Chrome API.
  useEffect(() => {
    const handleMessage = (message: { type?: string }) => {
      if (message?.type === 'CLOSE_VIEW' && !isClosingRef.current) {
        console.log('[App] CLOSE_VIEW received — closing window');
        isClosingRef.current = true;
        window.close();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      fetchNetworks();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchNetworks]);

  useEffect(() => {
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') {
        return;
      }

      const networkChange = changes[DAPP_NETWORK_ID_STORAGE_KEY];
      if (typeof networkChange?.newValue === 'string') {
        setNetworkId(networkChange.newValue);
      }

      if (
        changes[DAPP_CUSTOM_NETWORKS_STORAGE_KEY] ||
        changes[APP_CUSTOM_NETWORKS_STORAGE_KEY]
      ) {
        void syncCustomNetworks();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [setNetworkId, syncCustomNetworks]);

  useEffect(() => {
    void storage.set(DAPP_NETWORK_ID_STORAGE_KEY, networkId).catch((error) => {
      console.warn('[App] Failed to sync zkApp network id:', error);
    });
  }, [networkId]);

  if (!isRestored) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <CacheCleaner />
      <QueryRestorationBoundary>
        <PopupRoutes />
      </QueryRestorationBoundary>
    </PersistQueryClientProvider>
  );
};

export default App;
