export const TAB_IDS = ['blocklist', 'pomodoro'] as const;

export type TabId = (typeof TAB_IDS)[number];

export const DEFAULT_TAB: TabId = 'blocklist';

/** Resolves a stored (possibly missing or corrupt) value to a valid tab. */
export function resolveTab(value: unknown): TabId {
  return TAB_IDS.includes(value as TabId) ? (value as TabId) : DEFAULT_TAB;
}
