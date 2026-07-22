import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function cookieRow(page: Page, name: string) {
  return page.locator('.cookie-row', {
    has: page.locator('.cookie-row__name', { hasText: name }),
  });
}

Given(
  'the browser has a JWT cookie {string} for {string} expiring in one hour',
  async ({ jar }, name: string, domain: string) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'auth0|user-1', exp })}.fakesig`;
    await jar.seed([{ name, domain, value: jwt }]);
  },
);

Then('the cookie row {string} shows a {string} badge', async ({ page }, name: string, badge: string) => {
  await expect(cookieRow(page, name).locator('.cookie-row__badge', { hasText: badge })).toBeVisible();
});

When('I expand the cookie row {string}', async ({ page }, name: string) => {
  await cookieRow(page, name).locator('.cookie-row__name').click();
});

Then('the decoded panel shows an unexpired token', async ({ page }) => {
  await expect(page.locator('.token-panel__exp')).toHaveText(/Expires in/);
});

Then('the decoded panel shows claim value {string}', async ({ page }, value: string) => {
  await expect(page.locator('.token-panel__claims')).toContainText(value);
});
