import { describe, expect, it } from 'vitest';
import { phaseEndView } from './phase-end-view';

function params(search: string): URLSearchParams {
  return new URLSearchParams(search);
}

describe('Feature: Celebration page for a finished phase', () => {
  describe('Scenario: a focus session just finished', () => {
    it('Given finished=focus with 25 minutes, When the view is derived, Then it announces the break with the minutes done', () => {
      expect(phaseEndView(params('finished=focus&minutes=25'))).toEqual({
        title: 'Break time!',
        detail: '25 minutes of focus done. The break is running.',
        nextPhase: 'break',
      });
    });
  });

  describe('Scenario: a break just finished', () => {
    it('Given finished=break, When the view is derived, Then it calls back to focus', () => {
      expect(phaseEndView(params('finished=break&minutes=5'))).toEqual({
        title: 'Focus time!',
        detail: "Break's over — a new focus session just started.",
        nextPhase: 'focus',
      });
    });
  });

  describe('Scenario: the query string is missing or corrupt', () => {
    it.each(['', 'finished=nonsense', 'unrelated=1'])(
      'Given the query "%s", When the view is derived, Then it falls back to the finished-focus variant',
      (search) => {
        expect(phaseEndView(params(search))).toEqual({
          title: 'Break time!',
          detail: 'Focus session done. The break is running.',
          nextPhase: 'break',
        });
      },
    );

    it.each(['finished=focus', 'finished=focus&minutes=abc', 'finished=focus&minutes=-5'])(
      'Given focus finished but unusable minutes in "%s", When the view is derived, Then the detail skips the number',
      (search) => {
        expect(phaseEndView(params(search)).detail).toBe('Focus session done. The break is running.');
      },
    );
  });
});
