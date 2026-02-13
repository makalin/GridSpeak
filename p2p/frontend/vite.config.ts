import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:7070';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
});
