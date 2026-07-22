// MV3 service worker. Records every cookie change into a session-storage
// ring buffer for the Timeline view. The chrome.cookies.onChanged listener is
// registered synchronously at top level (required for the event to wake the
// worker); read-modify-writes are serialized through a promise chain so
// interleaved events can't clobber each other within one worker lifetime.
import {
  TIMELINE_PAUSED_KEY,
  appendEvents,
  eventFromChange,
  loadTimeline,
  saveTimeline,
} from '../lib/timeline';

let paused = false;
const ready = chrome.storage.session
  .get(TIMELINE_PAUSED_KEY)
  .then((stored) => {
    paused = stored[TIMELINE_PAUSED_KEY] === true;
  })
  .catch(() => undefined);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session' && changes[TIMELINE_PAUSED_KEY]) {
    paused = changes[TIMELINE_PAUSED_KEY].newValue === true;
  }
});

let chain: Promise<unknown> = ready;
chrome.cookies.onChanged.addListener((info) => {
  const event = eventFromChange(info);
  chain = chain.then(async () => {
    if (paused) return;
    await saveTimeline(appendEvents(await loadTimeline(), [event]));
  });
});

chrome.runtime.onInstalled.addListener(() => {
  // no-op
});

export {};
