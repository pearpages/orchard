/** Persisted manager UI state — restores the last search/view across opens. */

export interface UiState {
  managerQuery: string;
  managerView: 'cookies' | 'storage' | 'timeline';
  selectedDomain: string | null;
}

export const DEFAULT_UI_STATE: UiState = {
  managerQuery: '',
  managerView: 'cookies',
  selectedDomain: null,
};

const STORAGE_KEY = 'uiState';

export async function loadUiState(): Promise<UiState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_UI_STATE, ...(stored[STORAGE_KEY] as Partial<UiState> | undefined) };
}

export async function saveUiState(partial: Partial<UiState>): Promise<void> {
  const current = await loadUiState();
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...current, ...partial } });
}
