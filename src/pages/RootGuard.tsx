import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DAPP_PENDING_APPROVAL_STORAGE_KEY } from '@/lib/dapp';
import { sessionStorage } from '@/lib/storage';
import { useSessionStore } from '@/stores/session-store';
import { useWalletStore } from '@/stores/wallet-store';
import { GenericSkeleton } from '@/components/ui/skeleton-loaders';

export const RootGuard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSessionStore();
  const { publicKey } = useWalletStore();

  useEffect(() => {
    let cancelled = false;

    const redirect = async () => {
      const pendingRequest = await sessionStorage.get(
        DAPP_PENDING_APPROVAL_STORAGE_KEY,
      );

      if (cancelled) {
        return;
      }

      if (pendingRequest) {
        navigate('/dapp/approval', { replace: true });
        return;
      }

      if (isAuthenticated && publicKey) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/welcome', { replace: true });
      }
    };

    void redirect();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, publicKey, navigate]);

  // Show loader while determining where to redirect
  return <GenericSkeleton />;
};
