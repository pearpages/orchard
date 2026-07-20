export interface Settings {
  focusMinutes: number;
  breakMinutes: number;
}

export interface BlockerState {
  enabled: boolean;
  sites: string[];
  settings: Settings;
}

export type PomodoroPhase = 'focus' | 'break';

export type PomodoroState =
  | { status: 'idle' }
  | { status: 'running'; phase: PomodoroPhase; endsAt: number; totalMs: number }
  | { status: 'paused'; phase: PomodoroPhase; remainingMs: number; totalMs: number };
