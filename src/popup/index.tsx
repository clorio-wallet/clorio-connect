import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import App from './App';
import { ThemeProvider } from '@/components/theme-provider';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
}
