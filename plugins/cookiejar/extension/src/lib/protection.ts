import { bareDomain, cookieKey, type Cookie } from './cookies';

export interface ProtectionState {
  /** cookieKey() entries of individually protected cookies. */
  protectedCookies: string[];
  /** Normalized domains whose cookies (incl. subdomains) are protected. */
  protectedDomains: string[];
  /** Normalized domains pinned to the top of listings. */
  pinnedDomains: string[];
}

export const EMPTY_PROTECTION: ProtectionState = {
  protectedCookies: [],
  protectedDomains: [],
  pinnedDomains: [],
};

const STORAGE_KEY = 'protection';

export function normalizeDomain(domain: string): string {
  return bareDomain(domain).toLowerCase();
}

export function isDomainProtected(domain: string, state: ProtectionState): boolean {
  const d = normalizeDomain(domain);
  return state.protectedDomains.some((p) => d === p || d.endsWith(`.${p}`));
}

export function isCookieProtected(cookie: Cookie, state: ProtectionState): boolean {
  return state.protectedCookies.includes(cookieKey(cookie)) || isDomainProtected(cookie.domain, state);
}

/** Splits a bulk-delete target into what may be deleted and what protection keeps. */
export function partitionForBulkDelete(
  cookies: Cookie[],
  state: ProtectionState,
): { deletable: Cookie[]; skipped: Cookie[] } {
  const deletable: Cookie[] = [];
  const skipped: Cookie[] = [];
  for (const c of cookies) {
    (isCookieProtected(c, state) ? skipped : deletable).push(c);
  }
  return { deletable, skipped };
}

export function toggleEntry(list: string[], entry: string): string[] {
  return list.includes(entry) ? list.filter((e) => e !== entry) : [...list, entry];
}

export async function loadProtection(): Promise<ProtectionState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...EMPTY_PROTECTION, ...(stored[STORAGE_KEY] as Partial<ProtectionState> | undefined) };
}

export async function saveProtection(state: ProtectionState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export const PROTECTION_STORAGE_KEY = STORAGE_KEY;
