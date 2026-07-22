import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Playwright owns e2e/ — vitest must never pick those specs up.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
