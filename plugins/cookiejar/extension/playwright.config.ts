import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: ['e2e/fixtures.ts', 'e2e/steps/**/*.ts'],
});

export default defineConfig({
  testDir,
  // A persistent context (one Chromium profile per scenario) keeps cookie
  // state isolated; a single worker avoids profile contention.
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
});
