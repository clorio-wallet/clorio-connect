import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientOptions, Persister } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      networkMode: 'offlineFirst', // Use cache if offline
    },
  },
});

// Create a custom IDB persister
export const persister: Persister = {
  persistClient: async (client) => {
    try {
      await set('clorio-query-cache', client);
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  },
  restoreClient: async () => {
    try {
      return await get('clorio-query-cache');
    } catch (error) {
      console.error('Failed to restore cache:', error);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await del('clorio-query-cache');
    } catch (error) {
      console.error('Failed to remove cache:', error);
    }
  },
};

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  buster: 'v1', // Increment to bust cache if structure changes
};
