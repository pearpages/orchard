import { DEFAULT_TAB, resolveTab, type TabId } from './tabs';
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

const TAB_KEY = 'activeTab';

export async function getActiveTab(): Promise<TabId> {
  const stored = await chrome.storage.local.get({ [TAB_KEY]: DEFAULT_TAB });
  return resolveTab(stored[TAB_KEY]);
}

export async function setActiveTab(tab: TabId): Promise<void> {
  await chrome.storage.local.set({ [TAB_KEY]: tab });
}

export function onAnyStateChange(listener: () => void): void {
  chrome.storage.onChanged.addListener(listener);
}
