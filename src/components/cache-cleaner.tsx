import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '@/stores/wallet-store';

export const CacheCleaner = () => {
  const queryClient = useQueryClient();
  const publicKey = useWalletStore((s) => s.publicKey);
  const prevPublicKeyRef = useRef<string | null>(publicKey);

  useEffect(() => {
    // If publicKey changes (logout or switch)
    // We check if the previous value was different (and not just initialization)
    if (prevPublicKeyRef.current !== publicKey) {
      // Remove all queries from the cache
      // This ensures no data from the previous wallet remains
      queryClient.removeQueries();
      
      // Update ref
      prevPublicKeyRef.current = publicKey;
    }
  }, [publicKey, queryClient]);

  return null;
};
