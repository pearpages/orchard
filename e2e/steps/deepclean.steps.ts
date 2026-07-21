import { expect } from '@playwright/test';
import { Given, When } from '../fixtures';
import { domainGroup } from './common.steps';

Given('the browser has a cookie for the test origin', async ({ jar, staticServer }) => {
  const host = staticServer.host.split(':')[0];
  await jar.seed([{ name: 'sid', domain: host, value: 'x' }]);
});

When('I deep clean the test origin domain', async ({ page, staticServer }) => {
  const host = staticServer.host.split(':')[0];
  await domainGroup(page, host).getByTitle('Deep clean site data…').click();
});

When('I confirm the deep clean dialog', async ({ page }) => {
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: 'Deep clean', exact: true }).click();
  await expect(dialog).toBeHidden();
});
