export const STORAGE_KEY = "selectors";

export const getSelectors = async (): Promise<string[]> => {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return Array.isArray(value) ? value : [];
};

export const setSelectors = (selectors: string[]): Promise<void> =>
  chrome.storage.sync.set({ [STORAGE_KEY]: selectors });
