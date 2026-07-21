import { expect, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When, type SeedCookie } from '../fixtures';

export function domainGroup(page: Page, domain: string) {
  return page.locator('.domain-group', {
    has: page.locator('.domain-group__domain', { hasText: domain }),
  });
}

Given('the browser has cookies:', async ({ jar }, table: DataTable) => {
  await jar.seed(table.hashes() as unknown as SeedCookie[]);
});

When('I open the manager page', async ({ jar }) => {
  await jar.openManager();
});

When('I search for {string}', async ({ page }, query: string) => {
  await page.getByRole('searchbox').fill(query);
});

When('I reopen the manager page', async ({ page, jar }) => {
  // Give the debounced UI-state save (300 ms) time to persist first.
  await page.waitForTimeout(500);
  await jar.openManager();
});

Then('the search box contains {string}', async ({ page }, value: string) => {
  await expect(page.getByRole('searchbox')).toHaveValue(value);
});

Then('I see a domain group {string} with {int} cookie(s)', async ({ page }, domain: string, count: number) => {
  await expect(domainGroup(page, domain).locator('.domain-group__count')).toHaveText(String(count));
});

Then('I see {int} cookie row(s)', async ({ page }, count: number) => {
  await expect(page.locator('.cookie-row')).toHaveCount(count);
});

Then('the row shows cookie {string} for domain {string}', async ({ page }, name: string, domain: string) => {
  await expect(page.locator('.cookie-row__name')).toHaveText(name);
  await expect(page.locator('.domain-group__domain')).toHaveText(domain);
});

Then('a toast says {string}', async ({ page }, text: string) => {
  await expect(page.locator('.toast__message').filter({ hasText: text }).first()).toBeVisible();
});

Then('the browser has {int} cookie(s) for {string}', async ({ jar }, count: number, domain: string) => {
  await expect
    .poll(async () => (await jar.cookiesForDomain(domain)).length, { timeout: 5000 })
    .toBe(count);
});
