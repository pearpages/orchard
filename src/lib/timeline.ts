/**
 * Browser-wide log of cookie changes, recorded by the service worker into
 * chrome.storage.session (memory-only, cleared when the browser closes —
 * that's deliberate: recorded values are sensitive).
 */
import type { PartitionKey } from './cookies';
import { parseQuery } from './filter';
import { bareDomain } from './cookies';

export interface TimelineEvent {
  ts: number;
  removed: boolean;
  cause: chrome.cookies.CookieChangeInfo['cause'];
  cookie: {
    name: string;
    domain: string;
    path: string;
    storeId: string;
    partitionKey?: PartitionKey;
    value: string;
    valueTruncated?: boolean;
  };
}

export const TIMELINE_CAP = 1000;
export const TIMELINE_STORAGE_KEY = 'timeline';
export const TIMELINE_PAUSED_KEY = 'timelinePaused';

const VALUE_LIMIT = 2000;

/** Pure ring buffer: newest events first, capped. */
export function appendEvents(
  existing: TimelineEvent[],
  incoming: TimelineEvent[],
  cap: number = TIMELINE_CAP,
): TimelineEvent[] {
  return [...incoming, ...existing].slice(0, cap);
}

export function eventFromChange(
  info: chrome.cookies.CookieChangeInfo,
  now: Date = new Date(),
): TimelineEvent {
  const { name, domain, path, storeId, partitionKey, value } = info.cookie;
  const truncated = value.length > VALUE_LIMIT;
  return {
    ts: now.getTime(),
    removed: info.removed,
    cause: info.cause,
    cookie: {
      name,
      domain,
      path,
      storeId,
      ...(partitionKey ? { partitionKey } : {}),
      value: truncated ? value.slice(0, VALUE_LIMIT) : value,
      ...(truncated ? { valueTruncated: true } : {}),
    },
  };
}

/** Pure: same query semantics as the cookie search (domain:/name:/free text). */
export function filterEvents(events: TimelineEvent[], query: string): TimelineEvent[] {
  const { domain, name, text } = parseQuery(query);
  if (!domain && !name && text.length === 0) return events;
  return events.filter((event) => {
    const eDomain = bareDomain(event.cookie.domain).toLowerCase();
    const eName = event.cookie.name.toLowerCase();
    const eValue = event.cookie.value.toLowerCase();
    if (domain && !eDomain.includes(domain)) return false;
    if (name && !eName.includes(name)) return false;
    return text.every((t) => eDomain.includes(t) || eName.includes(t) || eValue.includes(t));
  });
}

export async function loadTimeline(): Promise<TimelineEvent[]> {
  const stored = await chrome.storage.session.get(TIMELINE_STORAGE_KEY);
  return (stored[TIMELINE_STORAGE_KEY] as TimelineEvent[] | undefined) ?? [];
}

export async function saveTimeline(events: TimelineEvent[]): Promise<void> {
  await chrome.storage.session.set({ [TIMELINE_STORAGE_KEY]: events });
}

export async function clearTimeline(): Promise<void> {
  await chrome.storage.session.set({ [TIMELINE_STORAGE_KEY]: [] });
}

export async function loadPaused(): Promise<boolean> {
  const stored = await chrome.storage.session.get(TIMELINE_PAUSED_KEY);
  return stored[TIMELINE_PAUSED_KEY] === true;
}

export async function setPaused(paused: boolean): Promise<void> {
  await chrome.storage.session.set({ [TIMELINE_PAUSED_KEY]: paused });
}
