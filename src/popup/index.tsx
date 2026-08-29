import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import '../i18n';
import App from './App';
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import PaperWalletPrintPage from '@/pages/paper-wallet-print';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  const isPaperWalletPrint = window.location.hash.startsWith('#/paper-wallet');

  root.render(
    isPaperWalletPrint ? (
      <PaperWalletPrintPage />
    ) : (
      <React.StrictMode>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ThemeProvider>
      </React.StrictMode>
    ),
  );
}
