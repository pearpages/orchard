import { useEffect, useState } from 'react'
import type { Chain } from '../../core/types'
import { formatLatency, truncateUrl } from '../utils/format'
import { ExportBar } from './ExportBar'
import { HopRow } from './HopRow'
import { IssuePanel } from './IssuePanel'
import { StatusBadge } from './StatusBadge'
import './ChainView.scss'

function totalLatency(chain: Chain): number | null {
  if (chain.endedAt != null) return chain.endedAt - chain.startedAt
  return null
}

export function ChainView({ chain }: { chain: Chain }) {
  const [flashedHop, setFlashedHop] = useState<number | null>(null)
  const redirects = chain.hops.length - 1
  const finalHop = chain.hops[chain.hops.length - 1]

  useEffect(() => {
    if (flashedHop == null) return
    document.getElementById(`hop-${flashedHop}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    const timer = window.setTimeout(() => setFlashedHop(null), 1200)
    return () => window.clearTimeout(timer)
  }, [flashedHop])

  return (
    <div className="chain-view">
      <header className="chain-view__summary">
        <StatusBadge hop={finalHop} />
        <span className="chain-view__count">
          {redirects} redirect{redirects === 1 ? '' : 's'}
        </span>
        <span className="chain-view__latency">{formatLatency(totalLatency(chain))}</span>
        {chain.status === 'active' && <span className="chain-view__live">in flight…</span>}
      </header>
      {chain.hops.length > 1 && (
        <p className="chain-view__route" title={`${chain.hops[0].url} → ${chain.finalUrl ?? '?'}`}>
          {truncateUrl(chain.hops[0].url, 30)} <span className="chain-view__arrow">→</span>{' '}
          {chain.finalUrl ? truncateUrl(chain.finalUrl, 30) : '…'}
        </p>
      )}
      <IssuePanel issues={chain.issues} onSelectHop={setFlashedHop} />
      <ol className="chain-view__hops">
        {chain.hops.map((hop, index) => (
          <HopRow key={index} hop={hop} index={index} flashed={flashedHop === index} />
        ))}
      </ol>
      <ExportBar chain={chain} />
    </div>
  )
}
