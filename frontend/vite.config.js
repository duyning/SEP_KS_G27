import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxy = { '/api': { target: process.env.API_TARGET || env.API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true } };
  return {
    plugins: [react()],
    ...(process.env.HLRCS_VITE_LAN_INSTANCE === '1' && { cacheDir: 'node_modules/.vite-hlrcs-lan' }),
    server: { port: 5173, strictPort: true, proxy },
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
