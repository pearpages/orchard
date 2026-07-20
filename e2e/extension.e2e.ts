import { BLOCKED_SITE, expect, expectRuleCount, openPopup, test } from './fixtures';

test.describe('Feature: The extension runs without being installed by hand', () => {
  test('Scenario: Given the built dist/, When Chromium starts, Then the MV3 service worker registers', async ({
    extensionId,
    serviceWorker,
  }) => {
    expect(extensionId).toMatch(/^[a-p]{32}$/);
    expect(serviceWorker.url()).toBe(`chrome-extension://${extensionId}/background.js`);
  });
});

test.describe('Feature: Blocking a site', () => {
  test('Scenario: Given a site added through the popup, When visiting it, Then the browser lands on the blocked page', async ({
    context,
    extensionId,
    serviceWorker,
    siteUrl,
  }) => {
    const popup = await openPopup(context, extensionId);
    await popup.fill('#blocklist-input', siteUrl);
    await popup.click('.blocklist__form button[type="submit"]');
    await expect(popup.locator('.blocklist__site')).toHaveText(BLOCKED_SITE);
    await expectRuleCount(serviceWorker, 1);

    const page = await context.newPage();
    await page.goto(siteUrl);
    await expect(page).toHaveURL(
      `chrome-extension://${extensionId}/blocked/blocked.html?site=${BLOCKED_SITE}`,
    );
    await expect(page.locator('.sign__title')).toHaveText('Closed for focus');
    await expect(page.locator('#blocked-site')).toHaveText(BLOCKED_SITE);
  });
});

test.describe('Feature: Master on/off switch', () => {
  test('Scenario: Given a blocked site, When blocking is switched off, Then the site loads again — and blocks again when switched back on', async ({
    context,
    extensionId,
    serviceWorker,
    siteUrl,
  }) => {
    const popup = await openPopup(context, extensionId);
    await popup.fill('#blocklist-input', BLOCKED_SITE);
    await popup.click('.blocklist__form button[type="submit"]');
    await expectRuleCount(serviceWorker, 1);

    await popup.click('.switch__track'); // off
    await expect(popup.locator('#toggle-status')).toHaveText('Blocking is off');
    await expectRuleCount(serviceWorker, 0);

    const page = await context.newPage();
    await page.goto(siteUrl);
    await expect(page.locator('h1')).toHaveText('Local test site');

    await popup.click('.switch__track'); // back on
    await expect(popup.locator('#toggle-status')).toHaveText('Blocking is on');
    await expectRuleCount(serviceWorker, 1);

    await page.goto(siteUrl);
    await expect(page).toHaveURL(
      `chrome-extension://${extensionId}/blocked/blocked.html?site=${BLOCKED_SITE}`,
    );
  });
});

test.describe('Feature: Tabs keep their state across popup openings', () => {
  test('Scenario: Given the Pomodoro tab was left open, When the popup reopens, Then Pomodoro is still the open tab', async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const popup = await openPopup(context, extensionId);
    await expect(popup.locator('button[data-tab="blocklist"]')).toHaveAttribute('aria-selected', 'true');

    await popup.click('button[data-tab="pomodoro"]');
    await expect(popup.locator('[data-panel="pomodoro"]')).toBeVisible();
    await expect
      .poll(() =>
        serviceWorker.evaluate(() =>
          chrome.storage.local.get('activeTab').then((stored) => stored['activeTab']),
        ),
      )
      .toBe('pomodoro');
    await popup.close();

    const reopened = await openPopup(context, extensionId);
    await expect(reopened.locator('button[data-tab="pomodoro"]')).toHaveAttribute('aria-selected', 'true');
    await expect(reopened.locator('[data-panel="pomodoro"]')).toBeVisible();
    await expect(reopened.locator('[data-panel="blocklist"]')).toBeHidden();
  });
});

test.describe('Feature: Pomodoro badge on the toolbar icon', () => {
  test('Scenario: Given a focus session, When it starts, pauses, and resets, Then the badge shows 25m, then the pause glyph, then clears', async ({
    context,
    extensionId,
    serviceWorker,
  }) => {
    const badgeText = () => serviceWorker.evaluate(() => chrome.action.getBadgeText({}));

    const popup = await openPopup(context, extensionId);
    await popup.click('button[data-tab="pomodoro"]');

    await popup.click('button[data-action="start-focus"]');
    await expect.poll(badgeText).toBe('25m');
    await expect(popup.locator('#dial-phase')).toHaveText('Focus');

    await popup.click('button[data-action="pause"]');
    await expect.poll(badgeText).toBe('⏸');
    await expect(popup.locator('#dial-phase')).toHaveText('Paused');

    await popup.click('button[data-action="stop"]');
    await expect.poll(badgeText).toBe('');
    await expect(popup.locator('#dial-phase')).toHaveText('Ready');
  });
});
