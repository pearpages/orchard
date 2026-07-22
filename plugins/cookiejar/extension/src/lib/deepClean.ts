/**
 * Browser-wide site-data wipe per domain via chrome.browsingData.
 *
 * browsingData origins are EXACT (no wildcards), so the origin list is built
 * from every hostname we can observe: the domain itself, subdomains seen in
 * the cookie jar, and matching open-tab hostnames (with their ports).
 * Subdomains that never set a cookie and aren't open in a tab won't be
 * cleaned — documented limitation.
 *
 * Cookies are deliberately NOT cleared here: browsingData wipes whole
 * registrable domains and would bypass the protection model. Cookie deletion
 * stays in the cookies lib (partitionForBulkDelete + removeCookies).
 */
import { bareDomain, type Cookie } from './cookies';

export interface DeepCleanTypes {
  localStorage: boolean;
  indexedDB: boolean;
  serviceWorkers: boolean;
  cacheStorage: boolean;
}

export const ALL_DEEP_CLEAN_TYPES: DeepCleanTypes = {
  localStorage: true,
  indexedDB: true,
  serviceWorkers: true,
  cacheStorage: true,
};

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Pure: every https+http origin we can attribute to this domain. */
export function buildOriginList(domain: string, cookies: Cookie[], tabUrls: string[]): string[] {
  const target = bareDomain(domain).toLowerCase();
  const hosts = new Set<string>([target]);
  for (const cookie of cookies) {
    const host = bareDomain(cookie.domain).toLowerCase();
    if (matchesDomain(host, target)) hosts.add(host);
  }
  for (const url of tabUrls) {
    try {
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) continue;
      if (matchesDomain(parsed.hostname.toLowerCase(), target)) {
        // Keep the port: origins are exact.
        hosts.add(parsed.host.toLowerCase());
      }
    } catch {
      // unparsable tab url — ignore
    }
  }
  const origins = [...hosts].flatMap((host) => [`https://${host}`, `http://${host}`]);
  return [...new Set(origins)].sort();
}

export async function deepClean(origins: string[], types: DeepCleanTypes): Promise<void> {
  const dataTypes: chrome.browsingData.DataTypeSet = {};
  if (types.localStorage) dataTypes.localStorage = true;
  if (types.indexedDB) dataTypes.indexedDB = true;
  if (types.serviceWorkers) dataTypes.serviceWorkers = true;
  if (types.cacheStorage) dataTypes.cacheStorage = true;
  if (Object.keys(dataTypes).length === 0 || origins.length === 0) return;
  await chrome.browsingData.remove({ origins: origins as [string, ...string[]] }, dataTypes);
}
