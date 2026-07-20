// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveTab } from '../shared/storage';
import { initTabs, renderTabs } from './tabs';

// The tests run against the real popup markup so the data-tab / data-panel
// contract cannot silently drift from popup.html.
const popupHtml = readFileSync(join(process.cwd(), 'src/popup/popup.html'), 'utf8');
const bodyMarkup = popupHtml.slice(popupHtml.indexOf('<body>') + '<body>'.length, popupHtml.indexOf('<script'));

let stored: Record<string, unknown>;

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: (defaults: Record<string, unknown>) => Promise.resolve({ ...defaults, ...stored }),
      set: (patch: Record<string, unknown>) => {
        Object.assign(stored, patch);
        return Promise.resolve();
      },
    },
  },
});

function tab(id: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`button[data-tab="${id}"]`)!;
}

function panel(id: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-panel="${id}"]`)!;
}

async function openPopup(): Promise<void> {
  document.body.innerHTML = bodyMarkup;
  initTabs();
  renderTabs(await getActiveTab());
}

beforeEach(() => {
  stored = {};
});

describe('Feature: Popup tabs for Blocklist and Pomodoro', () => {
  describe('Scenario: the popup opens for the first time', () => {
    it('Given no saved choice, When the popup opens, Then the Blocklist tab is open and Pomodoro is hidden', async () => {
      await openPopup();
      expect(tab('blocklist').getAttribute('aria-selected')).toBe('true');
      expect(panel('blocklist').hidden).toBe(false);
      expect(tab('pomodoro').getAttribute('aria-selected')).toBe('false');
      expect(panel('pomodoro').hidden).toBe(true);
    });
  });

  describe('Scenario: the user switches to the Pomodoro tab', () => {
    it('Given the popup is open, When the Pomodoro tab is clicked, Then its panel shows and the Blocklist panel hides', async () => {
      await openPopup();
      tab('pomodoro').click();
      expect(panel('pomodoro').hidden).toBe(false);
      expect(panel('blocklist').hidden).toBe(true);
      expect(tab('pomodoro').getAttribute('aria-selected')).toBe('true');
    });

    it('Given the popup is open, When the Pomodoro tab is clicked, Then the choice is persisted', async () => {
      await openPopup();
      tab('pomodoro').click();
      await Promise.resolve();
      expect(stored['activeTab']).toBe('pomodoro');
    });
  });

  describe('Scenario: the popup reopens where the user left it', () => {
    it('Given Pomodoro was left open, When the popup reopens, Then the Pomodoro tab is still open', async () => {
      await openPopup();
      tab('pomodoro').click();
      await Promise.resolve();

      await openPopup(); // popup closed and reopened
      expect(tab('pomodoro').getAttribute('aria-selected')).toBe('true');
      expect(panel('pomodoro').hidden).toBe(false);
      expect(panel('blocklist').hidden).toBe(true);
    });

    it('Given Blocklist was left open, When the popup reopens, Then the Blocklist tab is still open', async () => {
      await openPopup();
      tab('pomodoro').click();
      tab('blocklist').click();
      await Promise.resolve();

      await openPopup();
      expect(tab('blocklist').getAttribute('aria-selected')).toBe('true');
      expect(panel('blocklist').hidden).toBe(false);
    });
  });

  describe('Scenario: the stored choice is corrupt', () => {
    it('Given garbage in storage, When the popup opens, Then it falls back to the Blocklist tab', async () => {
      stored = { activeTab: 'nonsense' };
      await openPopup();
      expect(tab('blocklist').getAttribute('aria-selected')).toBe('true');
      expect(panel('blocklist').hidden).toBe(false);
    });
  });
});
