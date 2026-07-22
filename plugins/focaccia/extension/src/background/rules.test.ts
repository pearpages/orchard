import { describe, expect, it, vi } from 'vitest';
import { buildBlockingRules, regexFilterFor } from './rules';

// The rule builder reads Chrome's enum constants at call time; outside the
// extension runtime we provide their literal values.
vi.stubGlobal('chrome', {
  declarativeNetRequest: {
    ResourceType: { MAIN_FRAME: 'main_frame' },
    RuleActionType: { REDIRECT: 'redirect' },
  },
});

const BLOCKED_PAGE = 'chrome-extension://abc/blocked/blocked.html';

describe('Feature: Declarative blocking rules', () => {
  describe('Scenario: blocking is on with sites listed', () => {
    it('Given two sites, When rules are built, Then each gets a main-frame redirect rule with a stable id', () => {
      const rules = buildBlockingRules(['twitter.com', 'youtube.com'], true, BLOCKED_PAGE);
      expect(rules).toHaveLength(2);
      expect(rules.map((rule) => rule.id)).toEqual([1, 2]);
      for (const rule of rules) {
        expect(rule.condition.resourceTypes).toEqual(['main_frame']);
        expect(rule.action.type).toBe('redirect');
      }
    });

    it('Given the site "youtube.com", When rules are built, Then the redirect targets the blocked page naming that site', () => {
      const [rule] = buildBlockingRules(['youtube.com'], true, BLOCKED_PAGE);
      expect(rule?.action.redirect?.regexSubstitution).toBe(`${BLOCKED_PAGE}?site=youtube.com`);
    });
  });

  describe('Scenario: blocking is switched off', () => {
    it('Given listed sites but the switch off, When rules are built, Then no rules are produced', () => {
      expect(buildBlockingRules(['twitter.com'], false, BLOCKED_PAGE)).toEqual([]);
    });
  });

  describe('Scenario: a blocked domain is visited', () => {
    const matcher = new RegExp(regexFilterFor('youtube.com'));

    it.each([
      'https://youtube.com/',
      'http://youtube.com/watch?v=abc',
      'https://m.youtube.com/',
      'https://music.youtube.com/library',
      'https://youtube.com:8080/',
    ])('Given the blocklist has "youtube.com", When navigating to %s, Then the URL matches the rule', (url) => {
      expect(matcher.test(url)).toBe(true);
    });

    it.each([
      'https://notyoutube.com/',
      'https://youtube.com.evil.io/',
      'https://example.com/youtube.com',
    ])('Given the blocklist has "youtube.com", When navigating to %s, Then the URL does NOT match', (url) => {
      expect(matcher.test(url)).toBe(false);
    });

    it('Given a domain, When the filter is built, Then regex metacharacters in it are escaped literally', () => {
      expect(regexFilterFor('news.ycombinator.com')).toContain('news\\.ycombinator\\.com');
    });
  });
});
