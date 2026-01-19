import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/session-store';
import { storage } from '@/lib/storage';
import Dock from '@/components/ui/dock';
import { Home, Settings } from 'lucide-react';

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

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      onClick: () => navigate('/dashboard'),
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto pb-24">{children}</div>
      <div className="absolute bottom-4 left-0 right-0 z-50">
        <Dock items={navItems} className="py-2" />
      </div>
    </div>
  );
};
