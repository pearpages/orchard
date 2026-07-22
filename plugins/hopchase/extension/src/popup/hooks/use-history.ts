import { useEffect, useState } from 'react'
import type { Chain } from '../../core/types'
import { loadHistory, subscribeToHistory } from '../../storage/history-storage'

export function useHistory(): Chain[] {
  const [history, setHistory] = useState<Chain[]>([])

  useEffect(() => {
    void loadHistory().then(setHistory)
    return subscribeToHistory(setHistory)
  }, [])

  return history
}
