import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidePanelMode } from '@/hooks/use-side-panel-mode';
import PlaygroundPage from './Playground';
import LoginPage from '@/pages/Login';
import { ImportWalletPage } from '@/pages/onboarding/import-wallet';
import DashboardPage from '@/pages/Dashboard';
import { WelcomePage } from '@/pages/welcome';
import { CreateWalletPage } from '@/pages/onboarding/create-wallet';
import { VerifyMnemonicPage } from '@/pages/onboarding/verify-mnemonic';
import { Toaster } from '@/components/ui/toaster';

const Layout = () => {
  const { uiMode } = useSidePanelMode();

  return (
    <div
      className={cn(
        'h-full min-h-screen bg-background text-foreground flex flex-col mx-auto transition-all duration-300 ease-in-out',
        uiMode === 'popup'
          ? 'w-full max-w-[350px] shadow-2xl my-auto'
          : 'w-full',
      )}
    >
      <main className="flex-1 overflow-auto relative px-4">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/welcome" replace />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding/create" element={<CreateWalletPage />} />
          <Route path="/onboarding/verify" element={<VerifyMnemonicPage />} />
          <Route path="/onboarding/import" element={<ImportWalletPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
