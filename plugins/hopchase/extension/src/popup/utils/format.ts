export function formatLatency(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(timestamp).toLocaleDateString()
}

/** Middle-ellipsis long URLs so host and path tail both stay visible. */
export function truncateUrl(url: string, max = 68): string {
  if (url.length <= max) return url
  const keep = Math.floor((max - 1) / 2)
  return `${url.slice(0, keep)}…${url.slice(url.length - keep)}`
}
