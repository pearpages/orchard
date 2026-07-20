import { describe, expect, it } from 'vitest';
import { BADGE_COLOR, badgeViewOf, nextPhase, phaseEndNotification } from './pomodoro-logic';

const NOW = 1_000_000;

describe('Feature: Pomodoro session flow', () => {
  describe('Scenario: sessions alternate automatically', () => {
    it('Given a focus session ends, When the next phase is chosen, Then it is a break', () => {
      expect(nextPhase('focus')).toBe('break');
    });

    it('Given a break ends, When the next phase is chosen, Then it is a focus session', () => {
      expect(nextPhase('break')).toBe('focus');
    });
  });
});

describe('Feature: Desktop notification when a phase ends', () => {
  describe('Scenario: a focus session finishes', () => {
    it('Given focus just ended, When the notification is derived, Then it celebrates and announces the break', () => {
      expect(phaseEndNotification('focus')).toEqual({
        title: 'Focus session complete',
        message: 'Nice work. Break starts now.',
      });
    });
  });

  describe('Scenario: a break finishes', () => {
    it('Given the break just ended, When the notification is derived, Then it calls back to focus', () => {
      expect(phaseEndNotification('break')).toEqual({
        title: 'Break is over',
        message: 'Back to it — a new focus session just started.',
      });
    });
  });
});

describe('Feature: Toolbar badge countdown', () => {
  describe('Scenario: no session is running', () => {
    it('Given an idle timer, When the badge is derived, Then it is empty', () => {
      expect(badgeViewOf({ status: 'idle' }, NOW)).toEqual({ text: '' });
    });
  });

  describe('Scenario: a session is running', () => {
    it('Given a focus session with 17m38s left, When the badge is derived, Then it rounds up to "18m" in the focus color', () => {
      const state = {
        status: 'running',
        phase: 'focus',
        endsAt: NOW + 17 * 60_000 + 38_000,
        totalMs: 25 * 60_000,
      } as const;
      expect(badgeViewOf(state, NOW)).toEqual({ text: '18m', color: BADGE_COLOR.focus });
    });

    it('Given a break with 30 seconds left, When the badge is derived, Then it never drops below "1m" and uses the break color', () => {
      const state = {
        status: 'running',
        phase: 'break',
        endsAt: NOW + 30_000,
        totalMs: 5 * 60_000,
      } as const;
      expect(badgeViewOf(state, NOW)).toEqual({ text: '1m', color: BADGE_COLOR.break });
    });
  });

  describe('Scenario: the session is paused', () => {
    it('Given a paused focus session, When the badge is derived, Then it shows the pause glyph instead of minutes', () => {
      const state = {
        status: 'paused',
        phase: 'focus',
        remainingMs: 10 * 60_000,
        totalMs: 25 * 60_000,
      } as const;
      expect(badgeViewOf(state, NOW)).toEqual({ text: '⏸', color: BADGE_COLOR.focus });
    });
  });
});
