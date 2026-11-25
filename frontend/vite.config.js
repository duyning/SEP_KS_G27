import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import {configureApiProxy} from './scripts/api-proxy.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target=process.env.API_TARGET || env.API_TARGET || 'http://127.0.0.1:8080';
  const proxy = { '/api': { target, changeOrigin: true, configure:instance=>configureApiProxy(instance,target) } };
  return {
    plugins: [react()],
    ...(process.env.HLRCS_VITE_LAN_INSTANCE === '1' && { cacheDir: 'node_modules/.vite-hlrcs-lan' }),
    server: {
      port: 5173, strictPort: true, proxy,
      // Prepare the entry graph and common lazy routes before the first visit.
      warmup: { clientFiles: ['./src/main.jsx', './src/pages/AuthPage.jsx', './src/pages/public/HomeLandingPage.jsx', './src/pages/public/CommunityPage.jsx'] },
    },
    preview: { port: 5173, strictPort: true, proxy },
    build: {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          propertyMap: fileURLToPath(new URL('./mobile-property-map.html', import.meta.url)),
        },
      },
    },
  };
});
