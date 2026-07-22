import type { Hop } from '../../core/types'
import './StatusBadge.scss'

function badgeClass(hop: Hop): string {
  if (hop.error) return 'err'
  if (hop.statusCode == null) return 'pending'
  if (hop.statusCode >= 400) return '4xx'
  if (hop.statusCode >= 300) return '3xx'
  return '2xx'
}

export function StatusBadge({ hop }: { hop: Hop }) {
  const kind = badgeClass(hop)
  const label = hop.error ? 'ERR' : hop.statusCode == null ? '…' : String(hop.statusCode)
  return <span className={`status-badge status-badge--${kind}`}>{label}</span>
}
