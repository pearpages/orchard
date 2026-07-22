import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from '../fixtures';

function storageGroup(page: Page, origin: string) {
  return page.locator('.storage-group', {
    has: page.locator('.storage-group__origin', { hasText: origin }),
  });
}

Given(
  'a test page is open that sets localStorage {string} to {string}',
  async ({ jar, staticServer }, key: string, value: string) => {
    await jar.openTab(
      `${staticServer.url}?lk=${encodeURIComponent(key)}&lv=${encodeURIComponent(value)}`,
    );
  },
);

When('I open the manager {string} view', async ({ jar }, view: string) => {
  await jar.openManagerView(view as 'cookies' | 'storage' | 'timeline');
});

Then(
  'I see a storage group for the test origin with key {string}',
  async ({ page, staticServer }, key: string) => {
    const group = storageGroup(page, staticServer.host);
    await expect(group.locator('.storage-row__key', { hasText: key })).toBeVisible();
  },
);

When('I edit the storage key {string} to {string}', async ({ page }, key: string, value: string) => {
  await page.getByRole('button', { name: `Edit ${key}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit storage key' });
  await dialog.getByLabel(/^Value/).fill(value);
  await dialog.getByRole('button', { name: 'Save value' }).click();
  await expect(dialog).toBeHidden();
});

When('I delete the storage key {string}', async ({ page }, key: string) => {
  await page.getByRole('button', { name: `Delete ${key}`, exact: true }).click();
});

Then('the test page localStorage {string} is {string}', async ({ jar }, key: string, value: string) => {
  await expect
    .poll(async () => jar.testPage!.evaluate((k: string) => localStorage.getItem(k), key))
    .toBe(value);
});

Then('the test page localStorage has {int} key(s)', async ({ jar }, count: number) => {
  await expect.poll(async () => jar.testPage!.evaluate(() => localStorage.length)).toBe(count);
});
