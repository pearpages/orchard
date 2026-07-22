import { STORAGE_KEY } from '../core/constants'
import type { AppState } from '../core/types'

export async function loadState(): Promise<AppState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as AppState | undefined) ?? null
}

export async function saveState(state: AppState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state })
}

export function subscribeToState(callback: (state: AppState) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== 'local') return
    const change = changes[STORAGE_KEY]
    if (change?.newValue) callback(change.newValue as AppState)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
