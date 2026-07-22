import type { Chain } from '../types'

const COLUMNS = ['index', 'url', 'method', 'status', 'redirect_kind', 'latency_ms', 'ip', 'from_cache', 'error']

function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toCsv(chain: Chain): string {
  const rows = chain.hops.map((hop, index) =>
    [
      String(index + 1),
      hop.url,
      hop.method,
      hop.statusCode == null ? '' : String(hop.statusCode),
      hop.redirectKind,
      hop.latencyMs == null ? '' : String(hop.latencyMs),
      hop.ip ?? '',
      String(hop.fromCache),
      hop.error ?? '',
    ]
      .map(escapeField)
      .join(','),
  )
  return [COLUMNS.join(','), ...rows].join('\r\n')
}
