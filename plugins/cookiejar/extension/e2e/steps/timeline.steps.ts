import { expect } from '@playwright/test';
import { Then, When } from '../fixtures';

When('the browser sets cookie {string} for {string}', async ({ jar }, name: string, domain: string) => {
  await jar.seed([{ name, domain, value: 'timeline-value' }]);
});

When('the browser removes cookie {string} for {string}', async ({ jar }, name: string, domain: string) => {
  await jar.removeCookie(name, domain);
});

Then('the timeline shows a set event for {string}', async ({ page }, name: string) => {
  await expect
    .poll(async () =>
      page
        .locator('.timeline__event--set', { has: page.locator('.timeline__name', { hasText: name }) })
        .count(),
    )
    .toBeGreaterThan(0);
});

Then('the timeline shows a removed event for {string}', async ({ page }, name: string) => {
  await expect
    .poll(async () =>
      page
        .locator('.timeline__event--removed', {
          has: page.locator('.timeline__name', { hasText: name }),
        })
        .count(),
    )
    .toBeGreaterThan(0);
});

When('I take a snapshot', async ({ page }) => {
  await page.getByRole('button', { name: 'Take snapshot' }).click();
});

When('I diff against the snapshot', async ({ page }) => {
  await page.getByRole('button', { name: /^Diff vs/ }).click();
});

Then('the diff lists {string} under {string}', async ({ page }, name: string, section: string) => {
  const sectionLocator = page.locator('.timeline__diff-section', {
    has: page.locator('.timeline__diff-heading', { hasText: section }),
  });
  await expect(sectionLocator.locator('.timeline__name', { hasText: name })).toBeVisible();
});
