import type { PomodoroPhase } from './types';

export type Command =
  | { type: 'pomodoro/start'; phase: PomodoroPhase }
  | { type: 'pomodoro/pause' }
  | { type: 'pomodoro/resume' }
  | { type: 'pomodoro/stop' };

export function sendCommand(command: Command): Promise<unknown> {
  return chrome.runtime.sendMessage(command);
}
