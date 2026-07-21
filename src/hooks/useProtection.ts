import { useCallback, useEffect, useState } from 'react';
import { cookieKey, type Cookie } from '../lib/cookies';
import {
  EMPTY_PROTECTION,
  PROTECTION_STORAGE_KEY,
  isCookieProtected,
  isDomainProtected,
  loadProtection,
  normalizeDomain,
  saveProtection,
  toggleEntry,
  type ProtectionState,
} from '../lib/protection';

/**
 * Protected cookies/domains and pinned domains, synced across the popup and
 * the manager through chrome.storage.onChanged.
 */
export function useProtection() {
  const [state, setState] = useState<ProtectionState>(EMPTY_PROTECTION);

  useEffect(() => {
    void loadProtection().then(setState);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[PROTECTION_STORAGE_KEY]) {
        setState({ ...EMPTY_PROTECTION, ...(changes[PROTECTION_STORAGE_KEY].newValue as ProtectionState) });
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const update = useCallback((updater: (prev: ProtectionState) => ProtectionState) => {
    setState((prev) => {
      const next = updater(prev);
      void saveProtection(next);
      return next;
    });
  }, []);

  const toggleCookie = useCallback(
    (cookie: Cookie) =>
      update((prev) => ({
        ...prev,
        protectedCookies: toggleEntry(prev.protectedCookies, cookieKey(cookie)),
      })),
    [update],
  );

  const toggleDomain = useCallback(
    (domain: string) =>
      update((prev) => ({
        ...prev,
        protectedDomains: toggleEntry(prev.protectedDomains, normalizeDomain(domain)),
      })),
    [update],
  );

  const togglePin = useCallback(
    (domain: string) =>
      update((prev) => ({
        ...prev,
        pinnedDomains: toggleEntry(prev.pinnedDomains, normalizeDomain(domain)),
      })),
    [update],
  );

  const isProtected = useCallback((cookie: Cookie) => isCookieProtected(cookie, state), [state]);
  const isDomainProtectedFn = useCallback(
    (domain: string) => isDomainProtected(domain, state),
    [state],
  );
  const isPinned = useCallback(
    (domain: string) => state.pinnedDomains.includes(normalizeDomain(domain)),
    [state],
  );

  return {
    state,
    isProtected,
    isDomainProtected: isDomainProtectedFn,
    isPinned,
    toggleCookie,
    toggleDomain,
    togglePin,
  };
}
