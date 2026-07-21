import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Then, When } from '../fixtures';
import { domainGroup } from './common.steps';

When('I delete the cookie {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
});

When('I delete all cookies for domain {string}', async ({ page }, domain: string) => {
  await domainGroup(page, domain)
    .getByTitle('Delete all cookies for this domain')
    .click();
});

When('I confirm the dialog', async ({ page }) => {
  await page.locator('.confirm-dialog__confirm').click();
});

When('I create a cookie:', async ({ page }, table: DataTable) => {
  const data = table.rowsHash();
  await page.getByRole('button', { name: '+ New cookie' }).click();
  const drawer = page.getByRole('dialog', { name: 'New cookie' });
  await drawer.getByLabel('Name').fill(data.name);
  await drawer.getByLabel('Domain').fill(data.domain);
  if (data.value) await drawer.getByLabel(/^Value/).fill(data.value);
  if (data.sameSite) await drawer.getByLabel('SameSite').selectOption(data.sameSite);
  if (data.secure === 'yes') await drawer.getByLabel('Secure', { exact: true }).check();
  await drawer.getByRole('button', { name: 'Create cookie' }).click();
  await expect(drawer).toBeHidden();
});

When(
  'I edit the cookie {string} changing its value to {string}',
  async ({ page }, name: string, value: string) => {
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Edit cookie' });
    await drawer.getByLabel(/^Value/).fill(value);
    await drawer.getByRole('button', { name: 'Save changes' }).click();
    await expect(drawer).toBeHidden();
  },
);

Then(
  'the browser has a cookie {string} on {string} with SameSite {string}',
  async ({ jar }, name: string, domain: string, sameSite: string) => {
    await expect
      .poll(async () => {
        const cookies = await jar.cookiesForDomain(domain);
        return cookies.find((c) => c.name === name)?.sameSite;
      })
      .toBe(sameSite);
  },
);

Then(
  'the cookie {string} on {string} has value {string}',
  async ({ jar }, name: string, domain: string, value: string) => {
    await expect
      .poll(async () => {
        const cookies = await jar.cookiesForDomain(domain);
        return cookies.find((c) => c.name === name)?.value;
      })
      .toBe(value);
  },
);

When('I export cookies for domain {string}', async ({ page, jar }, domain: string) => {
  const downloadPromise = page.waitForEvent('download');
  await domainGroup(page, domain).getByTitle('Export this domain as JSON').click();
  const download = await downloadPromise;
  jar.downloadPath = await download.path();
});

When('all cookies are deleted', async ({ jar }) => {
  await jar.clearAll();
});

When('I import the previously exported file', async ({ page, jar }) => {
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await page.locator('.import-dialog__file').setInputFiles(jar.downloadPath!);
  await page.getByRole('button', { name: /Import \d+ cookie/ }).click();
});
