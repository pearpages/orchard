import { HISTORY_STORAGE_KEY } from '../core/constants'
import type { Chain } from '../core/types'

// History is a ring buffer in storage.local so it survives browser restarts
// (that is the point: compare before/after a migration).

export async function loadHistory(): Promise<Chain[]> {
  const result = await chrome.storage.local.get(HISTORY_STORAGE_KEY)
  return (result[HISTORY_STORAGE_KEY] as Chain[] | undefined) ?? []
}

/** Prepend, newest first, capped at `limit`. */
export async function appendToHistory(chains: Chain[], limit: number): Promise<void> {
  if (chains.length === 0) return
  const history = await loadHistory()
  const next = [...[...chains].reverse(), ...history].slice(0, limit)
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: next })
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_STORAGE_KEY)
}

export function subscribeToHistory(callback: (history: Chain[]) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'local') return
    const change = changes[HISTORY_STORAGE_KEY]
    if (change) callback((change.newValue as Chain[] | undefined) ?? [])
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
