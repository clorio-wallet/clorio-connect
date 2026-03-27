import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import manifest from './src/manifest.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const manifestConfig = { ...manifest } as any;

if (process.env.BROWSER === 'firefox') {
  manifestConfig.browser_specific_settings = {
    gecko: { id: 'wallet@clorio', strict_min_version: '109.0' },
  };
  manifestConfig.sidebar_action = {
    default_panel: manifest.side_panel.default_path,
  };
  delete manifestConfig.side_panel;
  manifestConfig.permissions = manifest.permissions.filter(
    (p: string) => p !== 'sidePanel',
  );
}

export default defineConfig({
  plugins: [react(), crx({ manifest: manifestConfig }), nodePolyfills()],
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
      input: {
        popup: 'src/popup/index.html',
      },
    },
  },
  publicDir: 'public',
});
