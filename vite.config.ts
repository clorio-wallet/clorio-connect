import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load the appropriate manifest based on target browser
const isFirefox = process.env.BROWSER === 'firefox';
const manifestPath = resolve(
  __dirname,
  isFirefox ? './src/manifest.firefox.json' : './src/manifest.json',
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as any;

export default defineConfig({
  plugins: [react(), crx({ manifest }), nodePolyfills()],
  resolve: {
    alias: isFirefox
      ? {
          '@': '/src',
          'o1js': resolve(__dirname, './src/stubs/o1js.ts'),
          'mina-attestations': resolve(__dirname, './src/stubs/mina-attestations.ts'),
        }
      : {
          '@': '/src',
        },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
  build: {
    rollupOptions: {
      input: isFirefox
        ? {
            popup: 'src/popup/index.html',
            background: 'src/background.html',
          }
        : {
            popup: 'src/popup/index.html',
          },
      output: {
        manualChunks: {
          'vendor-crypto': ['mina-signer', '@scure/bip39', '@scure/bip32', '@noble/curves', '@noble/hashes'],
          'vendor-ledger': ['@ledgerhq/hw-transport-webusb', '@ledgerhq/devices', 'mina-ledger-js'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-hook-form'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-query-persist-client'],
          'vendor-other': ['zustand', 'i18next', 'framer-motion', 'lottie-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  publicDir: 'public',
});
