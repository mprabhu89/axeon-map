import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Keep browser login, Vite proxy, and direct local API tabs on the same cookie host.
    host: '127.0.0.1',
    proxy: {
      '/api': { target: process.env.AXEON_SERVER_URL ?? 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    css: true,
    exclude: ['server/dist/**', 'node_modules/**'],
  },
});
