export const TAB_IDS = ['blocklist', 'pomodoro'] as const;

export type TabId = (typeof TAB_IDS)[number];

export const DEFAULT_TAB: TabId = 'blocklist';

/** Resolves a stored (possibly missing or corrupt) value to a valid tab. */
export function resolveTab(value: unknown): TabId {
  return TAB_IDS.includes(value as TabId) ? (value as TabId) : DEFAULT_TAB;
}

export interface CountBadge {
  visible: boolean;
  text: string;
}

/** View model for the site counter on the Blocklist tab; hidden when empty. */
export function siteCountBadge(count: number): CountBadge {
  return count > 0 ? { visible: true, text: String(count) } : { visible: false, text: '' };
}
