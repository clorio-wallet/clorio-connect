import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { storage } from '@/lib/storage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, setHasVault } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated) {
        // Check if vault exists to decide where to redirect
        const vault = await storage.get('clorio_vault');
        if (vault) {
          setHasVault(true);
          navigate('/login');
        } else {
          setHasVault(false);
          navigate('/welcome');
        }
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, setHasVault]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
