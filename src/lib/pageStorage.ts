/**
 * Reading and mutating localStorage/sessionStorage of open tabs via
 * chrome.scripting. This is the only module that touches chrome.scripting.
 *
 * Injected functions are stringified by Chrome: they must be fully
 * self-contained and receive only JSON-serializable args.
 */

export interface StorageEntry {
  key: string;
  value: string;
}

export interface TabStorageResult {
  tabId: number;
  title: string;
  url: string;
  origin: string;
  /** false when injection failed (chrome:// pages, sleeping tabs…). */
  available: boolean;
  local: StorageEntry[];
  session: StorageEntry[];
}

export interface SessionTabStorage {
  tabId: number;
  title: string;
  entries: StorageEntry[];
}

export interface OriginStorage {
  origin: string;
  /** localStorage is origin-wide: deduped, first available tab wins. */
  localEntries: StorageEntry[];
  /** sessionStorage is per tab. */
  sessionTabs: SessionTabStorage[];
  /** All injectable tabs of this origin (mutations target tabIds[0] for local). */
  tabIds: number[];
  unavailableTabs: { tabId: number; title: string }[];
}

export type StorageArea = 'local' | 'session';

export function isInjectableTab(tab: chrome.tabs.Tab): boolean {
  return (
    tab.id !== undefined &&
    /^https?:/i.test(tab.url ?? '') &&
    !tab.discarded &&
    tab.status !== 'unloaded'
  );
}

function readerFunc(): { local: [string, string][]; session: [string, string][] } {
  const dump = (storage: Storage): [string, string][] => {
    const out: [string, string][] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null) out.push([key, storage.getItem(key) ?? '']);
    }
    return out;
  };
  return { local: dump(localStorage), session: dump(sessionStorage) };
}

async function injectReader(tabId: number): Promise<{ local: StorageEntry[]; session: StorageEntry[] } | null> {
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: readerFunc });
    const data = result?.result as ReturnType<typeof readerFunc> | undefined;
    if (!data) return null;
    const toEntries = (pairs: [string, string][]) => pairs.map(([key, value]) => ({ key, value }));
    return { local: toEntries(data.local), session: toEntries(data.session) };
  } catch {
    return null;
  }
}

/** Reads storage of a single tab (used by the popup and post-mutation refresh). */
export async function readTabStorage(
  tabId: number,
): Promise<{ available: boolean; local: StorageEntry[]; session: StorageEntry[] }> {
  const data = await injectReader(tabId);
  return data ? { available: true, ...data } : { available: false, local: [], session: [] };
}

/** Storage of every open tab, injectable or not. */
export async function readAllTabStorage(): Promise<TabStorageResult[]> {
  const tabs = await chrome.tabs.query({});
  const results = await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined && tab.url)
      .map(async (tab): Promise<TabStorageResult> => {
        const base = {
          tabId: tab.id!,
          title: tab.title ?? tab.url ?? `Tab ${tab.id}`,
          url: tab.url!,
          origin: originOf(tab.url!),
        };
        if (!isInjectableTab(tab)) return { ...base, available: false, local: [], session: [] };
        const data = await injectReader(tab.id!);
        return data
          ? { ...base, available: true, ...data }
          : { ...base, available: false, local: [], session: [] };
      }),
  );
  return results.filter((r) => /^https?:/i.test(r.origin));
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** Pure: merges per-tab results into per-origin groups. */
export function groupByOrigin(results: TabStorageResult[]): OriginStorage[] {
  const groups = new Map<string, OriginStorage>();
  for (const result of results) {
    let group = groups.get(result.origin);
    if (!group) {
      group = { origin: result.origin, localEntries: [], sessionTabs: [], tabIds: [], unavailableTabs: [] };
      groups.set(result.origin, group);
    }
    if (!result.available) {
      group.unavailableTabs.push({ tabId: result.tabId, title: result.title });
      continue;
    }
    // localStorage is shared across the origin's tabs: first available tab wins.
    if (group.tabIds.length === 0) {
      group.localEntries = [...result.local].sort((a, b) => a.key.localeCompare(b.key));
    }
    group.tabIds.push(result.tabId);
    if (result.session.length > 0) {
      group.sessionTabs.push({
        tabId: result.tabId,
        title: result.title,
        entries: [...result.session].sort((a, b) => a.key.localeCompare(b.key)),
      });
    }
  }
  return [...groups.values()].sort((a, b) => a.origin.localeCompare(b.origin));
}

export interface MutationTarget {
  tabId: number;
  area: StorageArea;
}

export async function setStorageItem(
  target: MutationTarget,
  key: string,
  value: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: target.tabId },
      func: (area: string, k: string, v: string) => {
        try {
          (area === 'local' ? localStorage : sessionStorage).setItem(k, v);
          return { ok: true as const };
        } catch (e) {
          return { ok: false as const, error: String(e) };
        }
      },
      args: [target.area, key, value],
    });
    return (result?.result as { ok: boolean; error?: string } | undefined) ?? { ok: false, error: 'No result' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function removeStorageItem(target: MutationTarget, key: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId: target.tabId },
    func: (area: string, k: string) => {
      (area === 'local' ? localStorage : sessionStorage).removeItem(k);
    },
    args: [target.area, key],
  });
}

export async function clearStorage(tabId: number, area: StorageArea | 'both'): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (which: string) => {
      if (which !== 'session') localStorage.clear();
      if (which !== 'local') sessionStorage.clear();
    },
    args: [area],
  });
}

export function serializeOriginStorage(origin: OriginStorage, exportedAt: Date = new Date()): string {
  return JSON.stringify(
    {
      format: 'cookiejar-storage/v1',
      exportedAt: exportedAt.toISOString(),
      origin: origin.origin,
      localStorage: Object.fromEntries(origin.localEntries.map((e) => [e.key, e.value])),
      sessionStorage: origin.sessionTabs.map((tab) => ({
        tab: tab.title,
        entries: Object.fromEntries(tab.entries.map((e) => [e.key, e.value])),
      })),
    },
    null,
    2,
  );
}
