import type { PomodoroPhase, PomodoroState, Settings } from './types';

export interface DialView {
  remainingMs: number;
  fraction: number;
  label: string;
  phase: PomodoroPhase;
}

/** What the popup dial should display for a given pomodoro state. */
export function dialViewOf(state: PomodoroState, settings: Settings, now: number): DialView {
  switch (state.status) {
    case 'running': {
      const remainingMs = Math.max(0, state.endsAt - now);
      return {
        remainingMs,
        fraction: remainingMs / state.totalMs,
        label: state.phase === 'focus' ? 'Focus' : 'Break',
        phase: state.phase,
      };
    }
    case 'paused':
      return {
        remainingMs: state.remainingMs,
        fraction: state.remainingMs / state.totalMs,
        label: 'Paused',
        phase: state.phase,
      };
    default:
      return {
        remainingMs: settings.focusMinutes * 60_000,
        fraction: 1,
        label: 'Ready',
        phase: 'focus',
      };
  }
}
