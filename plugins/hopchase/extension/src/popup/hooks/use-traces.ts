import { useEffect, useState } from 'react'
import type { TraceResult } from '../../core/types'
import { loadTraces, subscribeToTraces } from '../../storage/tracker-storage'

export function useTraces(): TraceResult[] {
  const [traces, setTraces] = useState<TraceResult[]>([])

  useEffect(() => {
    void loadTraces().then(setTraces)
    return subscribeToTraces(setTraces)
  }, [])

  return traces
}
