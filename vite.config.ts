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
    alias: { '@': '/src' },
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
    },
  },
  publicDir: 'public',
});
