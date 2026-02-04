import React, { useState, Suspense, lazy } from 'react';
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
import { Toaster } from '@/components/ui/toaster';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ApolloProvider } from '@apollo/client/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { client, initCache } from '@/lib/graphql/client';
import { useNetworkStore } from '@/stores/network-store';
import { useSessionStore } from '@/stores/session-store';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Dock from '@/components/ui/dock';
import { Home, Settings, HeartHandshake } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BackgroundMesh } from '@/components/ui/background-mesh';
import { WelcomePage } from '@/pages/Welcome';
import WalletUnlockPage from '@/pages/wallet-unlock';
import DevToolsLoader from '@/components/dev-tools-loader';

// Lazy load pages
const PlaygroundPage = lazy(() => import('./Playground'));
const ImportWalletPage = lazy(() =>
  import('@/pages/onboarding/import-wallet').then((module) => ({
    default: module.ImportWalletPage,
  })),
);
const CreateWalletPage = lazy(() =>
  import('@/pages/onboarding/create-wallet').then((module) => ({
    default: module.CreateWalletPage,
  })),
);
const VerifyMnemonicPage = lazy(() =>
  import('@/pages/onboarding/verify-mnemonic').then((module) => ({
    default: module.VerifyMnemonicPage,
  })),
);
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const SendPage = lazy(() => import('@/pages/Send'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const StakingPage = lazy(() => import('@/pages/Staking'));

const queryClient = new QueryClient();

// Configuration: List of routes (pathname) that should NOT have transition animations
const NO_ANIMATION_ROUTES: string[] = [];

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center pt-32 space-y-4">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col items-center"
    >
      <div className="h-1 w-32 bg-secondary overflow-hidden rounded-full">
        <motion.div
          className="h-full bg-primary origin-left"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.div>
  </div>
);

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
      onClick: () => navigate('/staking'),
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
  ];

  const activeLabel = navItems.find((item) => {
    if (item.label === 'Home') return location.pathname === '/dashboard';
    if (item.label === 'Staking') return location.pathname === '/staking';
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
      <BackgroundMesh />

      <main
        className={cn(
          'flex-1 overflow-auto relative px-4',
          activeLabel ? 'pb-24' : 'pb-0',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={isAnimated ? { opacity: 0, y: 5 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isAnimated ? { opacity: 0, y: 5 } : { opacity: 0, y: 0 }}
            transition={{ duration: isAnimated ? 0.2 : 0, ease: 'easeInOut' }}
            className="min-h-full flex flex-col w-full max-w-3xl mx-auto"
          >
            <Suspense fallback={<PageLoader />}>{element}</Suspense>
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
      <DevToolsLoader />
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
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/welcome" replace />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/wallet-unlock" element={<WalletUnlockPage />} />
              <Route path="/onboarding/create" element={<CreateWalletPage />} />
              <Route
                path="/onboarding/verify"
                element={<VerifyMnemonicPage />}
              />
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
                path="/send"
                element={
                  <ProtectedRoute>
                    <SendPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staking"
                element={
                  <ProtectedRoute>
                    <StakingPage />
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
      </QueryClientProvider>
    </ApolloProvider>
  );
};

export default App;
