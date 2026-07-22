import type { Chain, Header, Hop } from '../types'

function headerValue(headers: Header[], name: string): string | null {
  return headers.find((h) => h.name.toLowerCase() === name)?.value ?? null
}

function queryString(url: string): { name: string; value: string }[] {
  try {
    return [...new URL(url).searchParams].map(([name, value]) => ({ name, value }))
  } catch {
    return []
  }
}

function toEntry(hop: Hop, next: Hop | undefined) {
  const latency = hop.latencyMs ?? 0
  return {
    startedDateTime: new Date(hop.startedAt).toISOString(),
    time: latency,
    request: {
      method: hop.method,
      url: hop.url,
      httpVersion: 'HTTP/1.1',
      headers: hop.requestHeaders,
      queryString: queryString(hop.url),
      cookies: [],
      headersSize: -1,
      bodySize: -1,
    },
    response: {
      status: hop.statusCode ?? 0,
      statusText: hop.statusLine ?? '',
      httpVersion: 'HTTP/1.1',
      headers: hop.responseHeaders,
      cookies: [],
      redirectURL: next?.url ?? '',
      content: { size: -1, mimeType: headerValue(hop.responseHeaders, 'content-type') ?? 'x-unknown' },
      headersSize: -1,
      bodySize: -1,
    },
    cache: {},
    timings: { send: 0, wait: latency, receive: 0 },
    ...(hop.ip ? { serverIPAddress: hop.ip } : {}),
  }
}

/** Minimal valid HAR 1.2 — one entry per hop, importable into DevTools. */
export function toHar(chain: Chain): string {
  const har = {
    log: {
      version: '1.2',
      creator: { name: 'hopchase', version: '0.1.0' },
      entries: chain.hops.map((hop, index) => toEntry(hop, chain.hops[index + 1])),
    },
  }
  return JSON.stringify(har, null, 2)
}
