import React, { useState, useEffect, useRef } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '@/lib/query-client';
import { useNetworkStore } from '@/stores/network-store';
import { useSessionStore } from '@/stores/session-store';
import { CacheCleaner } from '@/components/cache-cleaner';
import { QueryRestorationBoundary } from '@/components/query-restoration-boundary';
import { PopupRoutes } from './PopupRoutes';

const App: React.FC = () => {
  const { fetchNetworks } = useNetworkStore();
  const { restoreSession } = useSessionStore();
  const [isRestored, setIsRestored] = useState(false);
  // Track whether we've already started closing to avoid double-close races.
  const isClosingRef = useRef(false);

  useEffect(() => {
    // Initialize cache and fetch networks
    const init = async () => {
      await restoreSession();
      await fetchNetworks();
      setIsRestored(true);
    };

    init();
  }, []);

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
