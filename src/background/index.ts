// Minimal MV3 service worker. chrome.cookies is used directly from the popup
// and manager pages; this worker exists as a stable anchor (e.g. Playwright
// discovers the extension id from its URL).
chrome.runtime.onInstalled.addListener(() => {
  // no-op
});

export {};
