import type { PomodoroPhase } from './types';

export interface PhaseEndView {
  title: string;
  detail: string;
  nextPhase: PomodoroPhase;
}

/**
 * What the celebration tab should show, derived from its query string
 * (?finished=focus&minutes=25). Corrupt input falls back to finished-focus.
 */
export function phaseEndView(params: URLSearchParams): PhaseEndView {
  if (params.get('finished') === 'break') {
    return {
      title: 'Focus time!',
      detail: "Break's over — a new focus session just started.",
      nextPhase: 'focus',
    };
  }
  const minutes = Number(params.get('minutes'));
  return {
    title: 'Break time!',
    detail:
      Number.isInteger(minutes) && minutes > 0
        ? `${minutes} minutes of focus done. The break is running.`
        : 'Focus session done. The break is running.',
    nextPhase: 'break',
  };
}
