import React, { useState } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useOutlet,
  useNavigate,
} from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidePanelMode } from '@/hooks/use-side-panel-mode';
import PlaygroundPage from './Playground';
import WalletUnlockPage from '@/pages/wallet-unlock';
import { ImportWalletPage } from '@/pages/onboarding/import-wallet';
import DashboardPage from '@/pages/Dashboard';
import SettingsPage from '@/pages/Settings';
import { WelcomePage } from '@/pages/welcome';
import { CreateWalletPage } from '@/pages/onboarding/create-wallet';
import { VerifyMnemonicPage } from '@/pages/onboarding/verify-mnemonic';
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApolloProvider } from '@apollo/client/react';
import { client, initCache } from '@/lib/graphql/client';
import { useNetworkStore } from '@/stores/network-store';
import { useSessionStore } from '@/stores/session-store';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Dock from '@/components/ui/dock';
import { Home, Settings, HeartHandshake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Configuration: List of routes (pathname) that should NOT have transition animations
const NO_ANIMATION_ROUTES: string[] = [];

const Layout = () => {
  const { uiMode } = useSidePanelMode();
  const location = useLocation();
  const element = useOutlet();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAnimated = !NO_ANIMATION_ROUTES.includes(location.pathname);

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      onClick: () => navigate('/dashboard'),
    },
    {
      icon: HeartHandshake,
      label: 'Staking',
      onClick: () =>
        toast({
          title: 'Not Implemented',
          description: 'Staking functionality coming soon.',
        }),
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
  ];

  const activeLabel = navItems.find((item) => {
    if (item.label === 'Home') return location.pathname === '/dashboard';
    if (item.label === 'Settings')
      return location.pathname.startsWith('/settings');
    return false;
  })?.label;

  return (
    <div
      className={cn(
        'h-full min-h-screen bg-background text-foreground flex flex-col mx-auto transition-all duration-300 ease-in-out',
        uiMode === 'popup'
          ? 'w-full max-w-[350px] shadow-2xl my-auto'
          : 'w-full',
      )}
    >
      <main className="flex-1 overflow-auto relative px-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={isAnimated ? { opacity: 0, y: 5 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isAnimated ? { opacity: 0, y: 5 } : { opacity: 0, y: 0 }}
            transition={{ duration: isAnimated ? 0.2 : 0, ease: 'easeInOut' }}
            className="h-full"
          >
            {element}
          </motion.div>
        </AnimatePresence>
      </main>

      {activeLabel && (
        <div
          className={cn(
            'fixed bottom-4 z-50 transition-all duration-300',
            uiMode === 'popup'
              ? 'left-1/2 -translate-x-1/2 w-full max-w-[350px] px-4'
              : 'left-0 right-0 px-4',
          )}
        >
          <Dock items={navItems} activeLabel={activeLabel} className="py-2" />
        </div>
      )}

      <Toaster />
    </div>
  );
};

const App: React.FC = () => {
  const { fetchNetworks } = useNetworkStore();
  const { restoreSession } = useSessionStore();
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    // Initialize cache and fetch networks
    const init = async () => {
      await initCache();
      await restoreSession();
      setIsRestored(true);
      await fetchNetworks();
    };

    init();

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
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/welcome" replace />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/wallet-unlock" element={<WalletUnlockPage />} />
            <Route path="/onboarding/create" element={<CreateWalletPage />} />
            <Route path="/onboarding/verify" element={<VerifyMnemonicPage />} />
            <Route path="/onboarding/import" element={<ImportWalletPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/playground" element={<PlaygroundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ApolloProvider>
  );
};

export default App;
