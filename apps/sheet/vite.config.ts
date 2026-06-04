import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Fixed port so the Tauri devUrl (src-tauri/tauri.conf.json) reliably matches.
  server: { port: 5174, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
