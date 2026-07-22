import { defineConfig } from '@playwright/test';
import { baseConfig } from '@browser-plugins/config/playwright.base.js';

export default defineConfig({
  ...baseConfig,
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
});
