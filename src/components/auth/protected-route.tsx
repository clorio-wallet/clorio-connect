import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, hasVault } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(hasVault ? '/wallet-unlock' : '/welcome', { replace: true });
    }
  }, [hasVault, isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
