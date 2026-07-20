// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { BlockerState } from '../shared/types';

// The tests run against the real popup markup so the badge element contract
// cannot silently drift from popup.html.
const popupHtml = readFileSync(join(process.cwd(), 'src/popup/popup.html'), 'utf8');
const bodyMarkup = popupHtml.slice(popupHtml.indexOf('<body>') + '<body>'.length, popupHtml.indexOf('<script'));

// blocklist.ts grabs its element refs when the module loads, so the markup
// must be in the document before importing — hence a fresh import per popup.
async function openPopup(): Promise<typeof import('./blocklist')> {
  document.body.innerHTML = bodyMarkup;
  vi.resetModules();
  return import('./blocklist');
}

function state(sites: string[]): BlockerState {
  return { enabled: true, sites, settings: { focusMinutes: 25, breakMinutes: 5 } };
}

function badge(): HTMLElement {
  return document.querySelector<HTMLElement>('#tab-blocklist-count')!;
}

describe('Feature: Site count badge on the Blocklist tab', () => {
  describe('Scenario: the blocklist is empty', () => {
    it('Given no blocked sites, When the blocklist renders, Then the tab shows no badge', async () => {
      const { renderBlocklist } = await openPopup();
      renderBlocklist(state([]));
      expect(badge().hidden).toBe(true);
    });
  });

  describe('Scenario: sites are blocked', () => {
    it('Given 6 blocked sites, When the blocklist renders, Then the tab badge shows 6', async () => {
      const { renderBlocklist } = await openPopup();
      renderBlocklist(state(['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com']));
      expect(badge().hidden).toBe(false);
      expect(badge().textContent).toBe('6');
    });

    it('Given 6 sites beyond the visible scroll, When the blocklist renders, Then all 6 are in the list', async () => {
      const { renderBlocklist } = await openPopup();
      renderBlocklist(state(['a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com']));
      expect(document.querySelectorAll('.blocklist__item')).toHaveLength(6);
    });
  });

  describe('Scenario: the list changes while the popup is open', () => {
    it('Given a badge showing 2, When the last sites are removed, Then the badge hides again', async () => {
      const { renderBlocklist } = await openPopup();
      renderBlocklist(state(['a.com', 'b.com']));
      expect(badge().textContent).toBe('2');

      renderBlocklist(state([]));
      expect(badge().hidden).toBe(true);
    });
  });
});
