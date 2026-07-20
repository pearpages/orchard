import { describe, expect, it } from 'vitest';
import { normalizeSite } from './sites';

describe('Feature: Blocklist site normalization', () => {
  describe('Scenario: the user pastes a full URL', () => {
    it('Given "https://www.YouTube.com/watch?v=abc", When normalized, Then it becomes "youtube.com"', () => {
      expect(normalizeSite('https://www.YouTube.com/watch?v=abc')).toBe('youtube.com');
    });

    it('Given a URL with a port and a hash, When normalized, Then port, path and hash are stripped', () => {
      expect(normalizeSite('http://example.com:8080/deep/path#section')).toBe('example.com');
    });
  });

  describe('Scenario: the user types a bare domain', () => {
    it('Given "twitter.com" with surrounding spaces, When normalized, Then it is kept as "twitter.com"', () => {
      expect(normalizeSite('  twitter.com  ')).toBe('twitter.com');
    });

    it('Given a subdomain "news.ycombinator.com", When normalized, Then the subdomain is preserved', () => {
      expect(normalizeSite('news.ycombinator.com')).toBe('news.ycombinator.com');
    });

    it('Given a leading "www.", When normalized, Then the "www." prefix is dropped', () => {
      expect(normalizeSite('www.reddit.com')).toBe('reddit.com');
    });
  });

  describe('Scenario: the user submits something that is not a domain', () => {
    it.each(['not a domain!', 'localhost', 'just-text', '.com', 'a..b', ''])(
      'Given %j, When normalized, Then it is rejected with null',
      (input) => {
        expect(normalizeSite(input)).toBeNull();
      },
    );
  });
});
