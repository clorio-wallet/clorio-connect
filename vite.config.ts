import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import manifest from './src/manifest.json';

const isFirefox = process.env.BROWSER === 'firefox';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const manifestConfig = { ...manifest } as any;

if (isFirefox) {
  manifestConfig.browser_specific_settings = {
    gecko: {
      id: 'wallet@clorio',
      strict_min_version: "109.0"
    }
  };

  if (manifestConfig.side_panel) {
    manifestConfig.sidebar_action = {
      default_panel: manifestConfig.side_panel.default_path,
    };
    delete manifestConfig.side_panel;
  }

  if (manifestConfig.permissions) {
    manifestConfig.permissions = manifestConfig.permissions.filter((p: string) => p !== 'sidePanel');
  }
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: manifestConfig }),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
      },
    },
  },
});
