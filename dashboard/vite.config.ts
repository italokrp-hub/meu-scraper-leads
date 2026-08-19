import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget =
  process.env.VITE_API_PROXY_TARGET || 'https://meu-scraper-leads.onrender.com';

export default defineConfig({
  plugins: [react()],
  server: {
    open: false,
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});