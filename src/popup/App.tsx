import React, { useState, useEffect, useCallback } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { client, initCache } from '@/lib/graphql/client';
import { useNetworkStore } from '@/stores/network-store';
import { useSessionStore } from '@/stores/session-store';
import { PopupRoutes } from './PopupRoutes';

const queryClient = new QueryClient();

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
      <QueryClientProvider client={queryClient}>
        <PopupRoutes />
      </QueryClientProvider>
    </ApolloProvider>
  );
};

export default App;
