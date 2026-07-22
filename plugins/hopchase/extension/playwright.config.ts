import { defineConfig } from '@playwright/test'
import { baseConfig } from '@browser-plugins/config/playwright.base.js'

export default defineConfig({
  ...baseConfig,
  testDir: './e2e',
  timeout: 60_000,
  use: {
    trace: 'retain-on-failure',
  },
})
