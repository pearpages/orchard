import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  groupByOrigin,
  readAllTabStorage,
  readTabStorage,
  type TabStorageResult,
} from '../lib/pageStorage';

/**
 * Storage of all open tabs, grouped by origin. Freshness model: load on
 * mount + manual refresh; tab changes only raise a `stale` hint (re-injecting
 * into every tab on every tab event would be wasteful).
 */
export function useTabStorage() {
  const [results, setResults] = useState<TabStorageResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setResults(await readAllTabStorage());
      setStale(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onRemoved = (tabId: number) => {
      setResults((prev) => prev.filter((r) => r.tabId !== tabId));
    };
    const onUpdated = (_tabId: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (info.status === 'complete') setStale(true);
    };
    chrome.tabs.onRemoved.addListener(onRemoved);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onRemoved.removeListener(onRemoved);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [refresh]);

  /** Re-reads a single tab after a mutation and merges it into state. */
  const refreshTab = useCallback(async (tabId: number) => {
    const data = await readTabStorage(tabId);
    setResults((prev) =>
      prev.map((r) => (r.tabId === tabId ? { ...r, ...data } : r)),
    );
  }, []);

  const origins = useMemo(() => groupByOrigin(results), [results]);

  return { origins, loading, stale, refresh, refreshTab };
}
