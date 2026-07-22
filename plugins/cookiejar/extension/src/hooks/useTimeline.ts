import { useCallback, useEffect, useState } from 'react';
import {
  TIMELINE_PAUSED_KEY,
  TIMELINE_STORAGE_KEY,
  clearTimeline,
  loadPaused,
  loadTimeline,
  setPaused as persistPaused,
  type TimelineEvent,
} from '../lib/timeline';

/** Live cookie-change log recorded by the service worker. */
export function useTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [paused, setPausedState] = useState(false);

  useEffect(() => {
    void loadTimeline().then(setEvents);
    void loadPaused().then(setPausedState);
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'session') return;
      if (changes[TIMELINE_STORAGE_KEY]) {
        setEvents((changes[TIMELINE_STORAGE_KEY].newValue as TimelineEvent[] | undefined) ?? []);
      }
      if (changes[TIMELINE_PAUSED_KEY]) {
        setPausedState(changes[TIMELINE_PAUSED_KEY].newValue === true);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const togglePause = useCallback(() => {
    setPausedState((prev) => {
      void persistPaused(!prev);
      return !prev;
    });
  }, []);

  const clear = useCallback(() => {
    setEvents([]);
    void clearTimeline();
  }, []);

  return { events, paused, togglePause, clear };
}
