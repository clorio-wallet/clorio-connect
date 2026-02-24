import React, { useState, useEffect } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions } from '@/lib/query-client';
import { client, initCache } from '@/lib/graphql/client';
import { useNetworkStore } from '@/stores/network-store';
import { useSessionStore } from '@/stores/session-store';
import { CacheCleaner } from '@/components/cache-cleaner';
import { QueryRestorationBoundary } from '@/components/query-restoration-boundary';
import { PopupRoutes } from './PopupRoutes';

const App: React.FC = () => {
  const { fetchNetworks } = useNetworkStore();
  const { restoreSession } = useSessionStore();
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    // Initialize cache and fetch networks
    const init = async () => {
      await initCache();
      await restoreSession();
      await fetchNetworks();
      setIsRestored(true);
    };

    init();
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
    <ApolloProvider client={client}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <CacheCleaner />
        <QueryRestorationBoundary>
          <PopupRoutes />
        </QueryRestorationBoundary>
      </PersistQueryClientProvider>
    </ApolloProvider>
  );
};

export default App;
