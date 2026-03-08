import React, { Suspense, lazy, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import DevToolsLoader from '@/components/dev-tools-loader';
import { WelcomePage } from '@/pages/Welcome';
import { RootGuard } from '@/pages/RootGuard';
import WalletUnlockPage from '@/pages/wallet-unlock';
import {
  DashboardSkeleton,
  TransactionsSkeleton,
  StakingSkeleton,
  SendSkeleton,
  SettingsSkeleton,
  OnboardingSkeleton,
  GenericSkeleton,
} from '@/components/ui/skeleton-loaders';
import { PopupLayout } from './PopupLayout';

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
const ImportLedgerPage = lazy(() =>
  import('@/pages/onboarding/import-ledger').then((module) => ({
    default: module.ImportLedgerPage,
  })),
);
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const TransactionsPage = lazy(() => import('@/pages/Transactions'));
const StakingPage = lazy(() => import('@/pages/Staking'));
const SendPage = lazy(() => import('@/pages/send'));

const SettingsPage = lazy(() => import('@/pages/Settings'));

type RouteConfig = {
  path: string;
  element?: ReactNode;
  protected?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
};

const routeConfigs: RouteConfig[] = [
  {
    path: '/',
    element: <RootGuard />,
  },
  {
    path: '/welcome',
    element: <WelcomePage />,
  },
  {
    path: '/wallet-unlock',
    element: <WalletUnlockPage />,
  },
  {
    path: '/onboarding/create',
    element: <CreateWalletPage />,
    fallback: <OnboardingSkeleton />,
  },
  {
    path: '/onboarding/verify',
    element: <VerifyMnemonicPage />,
    fallback: <OnboardingSkeleton />,
  },
  {
    path: '/onboarding/import',
    element: <ImportWalletPage />,
    fallback: <OnboardingSkeleton />,
  },
  {
    path: '/onboarding/ledger',
    element: <ImportLedgerPage />,
    fallback: <OnboardingSkeleton />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
    protected: true,
    fallback: <DashboardSkeleton />,
  },
  {
    path: '/transactions',
    element: <TransactionsPage />,
    protected: true,
    fallback: <TransactionsSkeleton />,
  },
  {
    path: '/send',
    element: <SendPage />,
    protected: true,
    fallback: <SendSkeleton />,
  },

  {
    path: '/staking',
    element: <StakingPage />,
    protected: true,
    fallback: <StakingSkeleton />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    protected: true,
    fallback: <SettingsSkeleton />,
  },
  {
    path: '/playground',
    element: <PlaygroundPage />,
    fallback: <GenericSkeleton />,
  },
];

const renderRouteElement = (config: RouteConfig) => {
  if (config.redirectTo) {
    return <Navigate to={config.redirectTo} replace />;
  }
  if (!config.element) {
    return null;
  }
  const contentWithSuspense = config.fallback ? (
    <Suspense fallback={config.fallback}>{config.element}</Suspense>
  ) : (
    config.element
  );
  if (config.protected) {
    return <ProtectedRoute>{contentWithSuspense}</ProtectedRoute>;
  }
  return contentWithSuspense;
};

export const PopupRoutes: React.FC = () => {
  return (
    <>
      <DevToolsLoader />
      <HashRouter>
        <Routes>
          <Route element={<PopupLayout />}>
            {routeConfigs.map((config) => (
              <Route
                key={config.path}
                path={config.path}
                element={renderRouteElement(config)}
              />
            ))}
          </Route>
        </Routes>
      </HashRouter>
    </>
  );
};
