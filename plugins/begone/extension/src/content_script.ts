import { STORAGE_KEY, getSelectors } from "./storage";

let selectors: string[] = [];

const removeIfFound = () =>
  selectors.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
      // ignore invalid selectors coming from storage
    }
  });

getSelectors()
  .then((stored) => {
    selectors = stored;
    removeIfFound();
  })
  .catch(() => {});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes[STORAGE_KEY]) return;
  const value = changes[STORAGE_KEY].newValue;
  selectors = Array.isArray(value) ? value : [];
  removeIfFound();
});

new MutationObserver(removeIfFound).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
