import { expect, test } from '@playwright/test';

// Placeholder E2E so the Playwright runner is wired in Phase 1. Real critical
// user flows (open / edit / save / reload per app) are added in Steps 3-5 once
// the Tauri windows exist.
test('e2e harness is configured', () => {
  expect(true).toBe(true);
});
