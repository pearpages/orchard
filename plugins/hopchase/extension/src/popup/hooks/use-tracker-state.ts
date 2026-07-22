import { useEffect, useState } from 'react'
import type { TrackerState } from '../../core/types'
import { loadTrackerState, subscribeToTrackerState } from '../../storage/tracker-storage'

export function useTrackerState(): TrackerState | null {
  const [state, setState] = useState<TrackerState | null>(null)

  useEffect(() => {
    void loadTrackerState().then((loaded) => {
      if (loaded) setState(loaded)
    })
    return subscribeToTrackerState(setState)
  }, [])

  return state
}
