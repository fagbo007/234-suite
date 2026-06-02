import { defineConfig } from '@playwright/test';

// E2E scaffold only. Real flows are wired once the Tauri windows exist
// (Phase 1, Steps 3-5). For now this keeps the Playwright config valid and
// gives us one trivial smoke spec to prove the runner is set up.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
});
