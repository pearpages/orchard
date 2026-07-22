import { describe, expect, it } from 'vitest';
import { formatClock } from './time';

describe('Feature: Countdown clock formatting', () => {
  describe('Scenario: a session is displayed on the dial', () => {
    it('Given 25 minutes remaining, When formatted, Then it reads "25:00"', () => {
      expect(formatClock(25 * 60_000)).toBe('25:00');
    });

    it('Given 61 seconds remaining, When formatted, Then it reads "1:01"', () => {
      expect(formatClock(61_000)).toBe('1:01');
    });

    it('Given 9 seconds remaining, When formatted, Then the seconds are zero-padded to "0:09"', () => {
      expect(formatClock(9_000)).toBe('0:09');
    });
  });

  describe('Scenario: the session has just ended', () => {
    it('Given zero remaining, When formatted, Then it reads "0:00"', () => {
      expect(formatClock(0)).toBe('0:00');
    });

    it('Given a slightly negative remainder (clock skew), When formatted, Then it clamps to "0:00"', () => {
      expect(formatClock(-500)).toBe('0:00');
    });
  });
});
