import { useCallback, useEffect, useRef, useState } from 'react'
import { createDefaultState } from '../../core/state'
import type { AppState } from '../../core/types'
import { loadState, saveState, subscribeToState } from '../../storage/app-storage'

const SAVE_DEBOUNCE_MS = 100

export function useAppState() {
  const [state, setState] = useState<AppState | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastSavedJson = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadState().then((loaded) => {
      if (!cancelled) setState((current) => current ?? loaded ?? createDefaultState())
    })
    const unsubscribe = subscribeToState((next) => {
      // Ignore the echo of our own debounced save; accept external changes.
      if (JSON.stringify(next) === lastSavedJson.current) return
      setState(next)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const update = useCallback((mutator: (prev: AppState) => AppState) => {
    setState((prev) => {
      if (!prev) return prev
      const next = mutator(prev)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        lastSavedJson.current = JSON.stringify(next)
        void saveState(next)
      }, SAVE_DEBOUNCE_MS)
      return next
    })
  }, [])

  return { state, update }
}
