import { useCallback, useEffect, useRef, useState } from 'react';
import { listAll, type Cookie } from '../lib/cookies';

const REFRESH_DEBOUNCE_MS = 150;

/**
 * Every cookie in the browser, kept live via chrome.cookies.onChanged
 * (debounced full refresh — simple and plenty fast).
 */
export function useCookies() {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refresh = useCallback(async () => {
    try {
      setCookies(await listAll());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChanged = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void refresh(), REFRESH_DEBOUNCE_MS);
    };
    chrome.cookies.onChanged.addListener(onChanged);
    return () => {
      clearTimeout(timer.current);
      chrome.cookies.onChanged.removeListener(onChanged);
    };
  }, [refresh]);

  return { cookies, loading, error, refresh };
}
