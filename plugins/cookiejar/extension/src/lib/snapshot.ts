/**
 * Cookie snapshots: capture the whole jar, run a flow, diff. Snapshots live
 * in chrome.storage.session (memory-only). Cookies-only for now — open-tab
 * storage snapshots are future work.
 */
import { cookieKey, listAll, type Cookie, type PartitionKey } from './cookies';

export interface SnapshotEntry {
  name: string;
  domain: string;
  path: string;
  storeId: string;
  partitionKey?: PartitionKey;
  value: string;
}

export interface Snapshot {
  ts: number;
  entries: Record<string, SnapshotEntry>;
}

export interface SnapshotDiff {
  added: SnapshotEntry[];
  removed: SnapshotEntry[];
  changed: { key: string; before: SnapshotEntry; after: SnapshotEntry }[];
}

export const SNAPSHOT_STORAGE_KEY = 'snapshot';

function entryFromCookie(c: Cookie): SnapshotEntry {
  return {
    name: c.name,
    domain: c.domain,
    path: c.path,
    storeId: c.storeId,
    ...(c.partitionKey ? { partitionKey: c.partitionKey } : {}),
    value: c.value,
  };
}

/** Pure. */
export function buildSnapshot(cookies: Cookie[], now: Date = new Date()): Snapshot {
  const entries: Record<string, SnapshotEntry> = {};
  for (const cookie of cookies) {
    entries[cookieKey(cookie)] = entryFromCookie(cookie);
  }
  return { ts: now.getTime(), entries };
}

/** Pure. */
export function diffSnapshots(before: Snapshot, after: Snapshot): SnapshotDiff {
  const diff: SnapshotDiff = { added: [], removed: [], changed: [] };
  for (const [key, entry] of Object.entries(after.entries)) {
    const previous = before.entries[key];
    if (!previous) diff.added.push(entry);
    else if (previous.value !== entry.value) diff.changed.push({ key, before: previous, after: entry });
  }
  for (const [key, entry] of Object.entries(before.entries)) {
    if (!(key in after.entries)) diff.removed.push(entry);
  }
  const byDomainName = (a: SnapshotEntry, b: SnapshotEntry) =>
    a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name);
  diff.added.sort(byDomainName);
  diff.removed.sort(byDomainName);
  diff.changed.sort((a, b) => byDomainName(a.after, b.after));
  return diff;
}

export async function takeSnapshot(): Promise<Snapshot> {
  const snapshot = buildSnapshot(await listAll());
  await chrome.storage.session.set({ [SNAPSHOT_STORAGE_KEY]: snapshot });
  return snapshot;
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  const stored = await chrome.storage.session.get(SNAPSHOT_STORAGE_KEY);
  return (stored[SNAPSHOT_STORAGE_KEY] as Snapshot | undefined) ?? null;
}
