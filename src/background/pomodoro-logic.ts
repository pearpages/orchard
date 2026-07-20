import type { PomodoroPhase, PomodoroState } from '../shared/types';

export const BADGE_COLOR: Record<PomodoroPhase, string> = {
  focus: '#b93a1f',
  break: '#5b8c51',
};

export function nextPhase(phase: PomodoroPhase): PomodoroPhase {
  return phase === 'focus' ? 'break' : 'focus';
}

export interface BadgeView {
  text: string;
  color?: string;
}

/** What the toolbar badge should show for a given pomodoro state. */
export function badgeViewOf(state: PomodoroState, now: number): BadgeView {
  if (state.status === 'idle') return { text: '' };
  const remainingMs = state.status === 'running' ? state.endsAt - now : state.remainingMs;
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return {
    text: state.status === 'paused' ? '⏸' : `${minutes}m`,
    color: BADGE_COLOR[state.phase],
  };
}
