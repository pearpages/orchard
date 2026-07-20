import type { BlockerState, PomodoroState } from './types';

export const BLOCKER_DEFAULTS: BlockerState = {
  enabled: true,
  sites: [],
  settings: { focusMinutes: 25, breakMinutes: 5 },
};

const POMODORO_KEY = 'pomodoro';

export async function getBlockerState(): Promise<BlockerState> {
  const stored = await chrome.storage.sync.get({ ...BLOCKER_DEFAULTS } as Record<string, unknown>);
  return stored as unknown as BlockerState;
}

export async function patchBlockerState(patch: Partial<BlockerState>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

export async function getPomodoroState(): Promise<PomodoroState> {
  const stored = await chrome.storage.local.get({ [POMODORO_KEY]: { status: 'idle' } });
  return stored[POMODORO_KEY] as PomodoroState;
}

export async function setPomodoroState(state: PomodoroState): Promise<void> {
  await chrome.storage.local.set({ [POMODORO_KEY]: state });
}

export function onAnyStateChange(listener: () => void): void {
  chrome.storage.onChanged.addListener(listener);
}
