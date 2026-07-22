import { describe, expect, it } from 'vitest';
import { dialViewOf } from './dial-view';
import type { Settings } from './types';

const settings: Settings = { focusMinutes: 25, breakMinutes: 5 };
const NOW = 1_000_000;

describe('Feature: Pomodoro dial display', () => {
  describe('Scenario: no session is running', () => {
    it('Given an idle timer, When the dial renders, Then it previews a full focus session labeled "Ready"', () => {
      const view = dialViewOf({ status: 'idle' }, settings, NOW);
      expect(view).toEqual({
        remainingMs: 25 * 60_000,
        fraction: 1,
        label: 'Ready',
        phase: 'focus',
      });
    });
  });

  describe('Scenario: a focus session is running', () => {
    it('Given 15 of 25 minutes left, When the dial renders, Then the arc shows 60% and the label is "Focus"', () => {
      const view = dialViewOf(
        { status: 'running', phase: 'focus', endsAt: NOW + 15 * 60_000, totalMs: 25 * 60_000 },
        settings,
        NOW,
      );
      expect(view.remainingMs).toBe(15 * 60_000);
      expect(view.fraction).toBeCloseTo(0.6);
      expect(view.label).toBe('Focus');
      expect(view.phase).toBe('focus');
    });

    it('Given the end time has already passed, When the dial renders, Then remaining time clamps to zero', () => {
      const view = dialViewOf(
        { status: 'running', phase: 'break', endsAt: NOW - 1_000, totalMs: 5 * 60_000 },
        settings,
        NOW,
      );
      expect(view.remainingMs).toBe(0);
      expect(view.label).toBe('Break');
    });
  });

  describe('Scenario: the session is paused', () => {
    it('Given a paused break with 2 of 5 minutes left, When the dial renders, Then it is labeled "Paused" and keeps the break color', () => {
      const view = dialViewOf(
        { status: 'paused', phase: 'break', remainingMs: 2 * 60_000, totalMs: 5 * 60_000 },
        settings,
        NOW,
      );
      expect(view.remainingMs).toBe(2 * 60_000);
      expect(view.fraction).toBeCloseTo(0.4);
      expect(view.label).toBe('Paused');
      expect(view.phase).toBe('break');
    });
  });
});
