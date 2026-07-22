import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { baseConfig } from '@browser-plugins/config/playwright.base.js';

const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: ['e2e/fixtures.ts', 'e2e/steps/**/*.ts'],
});

export default defineConfig({
  ...baseConfig,
  // A persistent context (one Chromium profile per scenario) keeps cookie
  // state isolated; the base config's single worker avoids profile contention.
  testDir,
});
