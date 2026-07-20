import { describe, expect, it } from 'vitest';
import { DEFAULT_TAB, resolveTab } from './tabs';

describe('Feature: Remembering the active popup tab', () => {
  describe('Scenario: the popup opens for the first time', () => {
    it('Given no stored tab, When the tab is resolved, Then it defaults to the blocklist', () => {
      expect(resolveTab(undefined)).toBe('blocklist');
      expect(DEFAULT_TAB).toBe('blocklist');
    });
  });

  describe('Scenario: the popup reopens after a previous visit', () => {
    it('Given "pomodoro" was left open, When the tab is resolved, Then the pomodoro tab is chosen', () => {
      expect(resolveTab('pomodoro')).toBe('pomodoro');
    });

    it('Given "blocklist" was left open, When the tab is resolved, Then the blocklist tab is chosen', () => {
      expect(resolveTab('blocklist')).toBe('blocklist');
    });
  });

  describe('Scenario: the stored value is corrupt', () => {
    it.each(['settings', 42, null, {}])(
      'Given the invalid stored value %j, When the tab is resolved, Then it falls back to the blocklist',
      (stored) => {
        expect(resolveTab(stored)).toBe(DEFAULT_TAB);
      },
    );
  });
});
