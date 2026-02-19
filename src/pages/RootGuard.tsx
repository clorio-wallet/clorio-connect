import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { useWalletStore } from '@/stores/wallet-store';
import { GenericSkeleton } from '@/components/ui/skeleton-loaders';

export const RootGuard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSessionStore();
  const { publicKey } = useWalletStore();

  useEffect(() => {
    // Redirect based on authentication state
    if (isAuthenticated && publicKey) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/welcome', { replace: true });
    }
  }, [isAuthenticated, publicKey, navigate]);

  // Show loader while determining where to redirect
  return <GenericSkeleton />;
};
