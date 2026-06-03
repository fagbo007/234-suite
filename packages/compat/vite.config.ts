import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // jsdom provides DOMParser for reading OOXML word/document.xml.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
