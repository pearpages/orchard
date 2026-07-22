import { expect } from '@playwright/test';
import { Then, When } from '../fixtures';

// "I expand the cookie row {string}" is defined in jwt.steps.ts and reused here.

When('I ask the AI to explain the cookie', async ({ page }) => {
  await page.getByRole('button', { name: /explain this cookie/i }).click();
});

Then('the AI panel offers to set up AI', async ({ page }) => {
  await expect(page.getByRole('button', { name: /set up ai/i })).toBeVisible();
});

When('I open AI settings', async ({ page }) => {
  await page.getByRole('button', { name: /set up ai/i }).click();
});

Then('the AI settings show a Claude API key field', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'AI settings' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Claude API key')).toBeVisible();
});
