import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Each test boots its own Chromium with the extension and a local site
  // server on a fixed port — keep them serial.
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  globalSetup: './e2e/global-setup.ts',
  reporter: 'list',
});
