/**
 * Canonical comparison form: lowercase scheme+host, default port stripped,
 * fragment dropped, path+query kept. Unparseable input is returned as-is.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    // URL already lowercases protocol/host and strips default ports.
    return parsed.toString()
  } catch {
    return url
  }
}

export function protocolOf(url: string): string | null {
  try {
    return new URL(url).protocol.replace(/:$/, '')
  } catch {
    return null
  }
}

/**
 * Parses a <meta http-equiv="refresh"> content attribute ("5; url=/next")
 * into an absolute URL, or null when there is no url part or it is invalid.
 */
export function parseMetaRefreshContent(content: string, baseUrl: string): string | null {
  const match = /^\s*\d+(?:\.\d+)?\s*[;,]\s*url\s*=\s*(.+)\s*$/i.exec(content)
  if (!match) return null
  const raw = match[1].trim().replace(/^["']|["']$/g, '')
  if (!raw) return null
  try {
    return new URL(raw, baseUrl).toString()
  } catch {
    return null
  }
}
