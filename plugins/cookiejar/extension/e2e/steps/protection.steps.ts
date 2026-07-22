import { When } from '../fixtures';
import { domainGroup } from './common.steps';

When('I protect the cookie {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name: `Protect ${name}`, exact: true }).click();
});

When('I protect the domain {string}', async ({ page }, domain: string) => {
  await domainGroup(page, domain).getByTitle('Protect domain from bulk delete').click();
});

When('I delete everything typing the confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete all…' }).click();
  await page.locator('.confirm-dialog__input').fill('DELETE');
  await page.locator('.confirm-dialog__confirm').click();
});
