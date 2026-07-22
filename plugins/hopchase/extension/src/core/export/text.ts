import type { Chain, Hop } from '../types'

const KIND_SUFFIX: Record<string, string> = {
  meta: 'meta refresh',
  js: 'js redirect',
  client: 'client redirect',
}

function line(hop: Hop): string {
  const status = hop.error ? 'ERR' : hop.statusCode == null ? '…' : String(hop.statusCode)
  const notes = [hop.error, KIND_SUFFIX[hop.redirectKind]].filter(Boolean)
  return `${status} ${hop.url}${notes.length > 0 ? ` (${notes.join(', ')})` : ''}`
}

/** Clipboard-friendly chain summary: one `<status> <url>` line per hop. */
export function toText(chain: Chain): string {
  return chain.hops.map(line).join('\n')
}
