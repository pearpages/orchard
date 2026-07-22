import { MAX_TRACES, TRACES_STORAGE_KEY, TRACKER_STORAGE_KEY } from '../core/constants'
import type { TraceResult, TrackerState } from '../core/types'

// Live chains belong in storage.session: they survive service-worker death but
// not a browser restart, which is exactly the lifetime a "current chain" has.

export async function loadTrackerState(): Promise<TrackerState | null> {
  const result = await chrome.storage.session.get(TRACKER_STORAGE_KEY)
  return (result[TRACKER_STORAGE_KEY] as TrackerState | undefined) ?? null
}

export async function saveTrackerState(state: TrackerState): Promise<void> {
  await chrome.storage.session.set({ [TRACKER_STORAGE_KEY]: state })
}

export function subscribeToTrackerState(callback: (state: TrackerState) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'session') return
    const change = changes[TRACKER_STORAGE_KEY]
    if (change?.newValue) callback(change.newValue as TrackerState)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export async function loadTraces(): Promise<TraceResult[]> {
  const result = await chrome.storage.session.get(TRACES_STORAGE_KEY)
  return (result[TRACES_STORAGE_KEY] as TraceResult[] | undefined) ?? []
}

export async function saveTraces(traces: TraceResult[]): Promise<void> {
  await chrome.storage.session.set({ [TRACES_STORAGE_KEY]: traces })
}

/** Insert or replace by id, newest first, capped at MAX_TRACES. */
export async function upsertTrace(trace: TraceResult): Promise<void> {
  const traces = await loadTraces()
  const existingIndex = traces.findIndex((t) => t.id === trace.id)
  if (existingIndex >= 0) {
    traces[existingIndex] = trace
    await saveTraces(traces)
  } else {
    await saveTraces([trace, ...traces].slice(0, MAX_TRACES))
  }
}

export function subscribeToTraces(callback: (traces: TraceResult[]) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'session') return
    const change = changes[TRACES_STORAGE_KEY]
    if (change?.newValue) callback(change.newValue as TraceResult[])
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
