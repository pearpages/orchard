import { useState } from 'react'
import type { Chain } from '../../core/types'
import { clearHistory } from '../../storage/history-storage'
import { useHistory } from '../hooks/use-history'
import { formatRelativeTime, truncateUrl } from '../utils/format'
import { ChainView } from './ChainView'
import { StatusBadge } from './StatusBadge'
import './HistoryTab.scss'

export function HistoryTab() {
  const history = useHistory()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected: Chain | null = history.find((chain) => chain.id === selectedId) ?? null

  if (selected) {
    return (
      <div className="history-tab">
        <button type="button" className="history-tab__back" onClick={() => setSelectedId(null)}>
          ← Back to history
        </button>
        <ChainView chain={selected} />
      </div>
    )
  }

  return (
    <div className="history-tab">
      {history.length === 0 ? (
        <p className="history-tab__empty">
          No chains recorded yet. Navigations that redirect (or carry issues) land here.
        </p>
      ) : (
        <>
          <ul className="history-tab__list">
            {history.map((chain) => (
              <li key={chain.id}>
                <button type="button" className="history-tab__item" onClick={() => setSelectedId(chain.id)}>
                  <StatusBadge hop={chain.hops[chain.hops.length - 1]} />
                  <span className="history-tab__url" title={chain.hops[0]?.url}>
                    {truncateUrl(chain.hops[0]?.url ?? '?', 46)}
                  </span>
                  <span className="history-tab__meta">
                    {chain.hops.length - 1} hop{chain.hops.length - 1 === 1 ? '' : 's'}
                    {chain.issues.length > 0 && ` · ${chain.issues.length} issue${chain.issues.length === 1 ? '' : 's'}`}
                  </span>
                  <span className="history-tab__time">{formatRelativeTime(chain.startedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="history-tab__clear" onClick={() => void clearHistory()}>
            Clear history
          </button>
        </>
      )}
    </div>
  )
}
