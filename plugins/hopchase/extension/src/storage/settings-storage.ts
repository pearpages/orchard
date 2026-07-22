import { SETTINGS_STORAGE_KEY, createDefaultSettings } from '../core/constants'
import type { Settings } from '../core/types'

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
  return { ...createDefaultSettings(), ...(result[SETTINGS_STORAGE_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings })
}

export function subscribeToSettings(callback: (settings: Settings) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'local') return
    const change = changes[SETTINGS_STORAGE_KEY]
    if (change?.newValue) callback({ ...createDefaultSettings(), ...(change.newValue as Partial<Settings>) })
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
