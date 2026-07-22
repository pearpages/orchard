import { TRACE_MARKER_HEADER } from './constants'
import { detectIssues } from './issues'
import type { Chain, Header, Hop, TraceResult } from './types'

/** The traceId a tracer fetch carries in its marker request header, if any. */
export function findTraceMarker(headers: Header[]): string | null {
  const marker = headers.find((h) => h.name.toLowerCase() === TRACE_MARKER_HEADER)
  return marker?.value ?? null
}

export function createTraceResult(id: string, url: string, at: number): TraceResult {
  return { id, url, status: 'pending', chain: null, error: null, startedAt: at }
}

function isRedirectStatus(statusCode: number | null): boolean {
  return statusCode != null && statusCode >= 300 && statusCode < 400
}

function stripMarker(hop: Hop): Hop {
  return {
    ...hop,
    requestHeaders: hop.requestHeaders.filter((h) => h.name.toLowerCase() !== TRACE_MARKER_HEADER),
  }
}

/**
 * Fold a finished background chain into the trace. Unlike tab navigations, a
 * service-worker fetch gets a NEW requestId per redirect hop, so a traced chain
 * arrives as several single-hop chains bound to the same traceId; the trace
 * stays 'pending' while its last hop is a 3xx (the follow-up request is coming).
 */
export function absorbChainIntoTrace(trace: TraceResult, chain: Chain): TraceResult {
  // A prior hop that "completed" with a 3xx actually redirected — relabel it
  // now that its follow-up arrived.
  const priorHops = (trace.chain?.hops ?? []).map((hop) =>
    hop.redirectKind === 'none' && isRedirectStatus(hop.statusCode)
      ? { ...hop, redirectKind: 'http' as const }
      : hop,
  )
  const hops = [...priorHops, ...chain.hops.map(stripMarker)]
  const merged: Chain = {
    ...chain,
    hops,
    startedAt: trace.chain?.startedAt ?? chain.startedAt,
    issues: [],
  }
  merged.issues = detectIssues(merged)
  const last = hops[hops.length - 1]
  const awaitingNext = chain.status !== 'error' && isRedirectStatus(last.statusCode)
  return {
    ...trace,
    status: chain.status === 'error' ? 'error' : awaitingNext ? 'pending' : 'done',
    chain: merged,
    error: chain.status === 'error' ? (last.error ?? null) : null,
  }
}

/** Settle a trace whose fetch finished but whose chain never closed itself. */
export function finalizeTraceResult(trace: TraceResult): TraceResult {
  if (trace.status !== 'pending') return trace
  if (!trace.chain) return failTraceResult(trace, 'No trace data captured.')
  return { ...trace, status: 'done', error: null }
}

export function failTraceResult(trace: TraceResult, error: string): TraceResult {
  return { ...trace, status: 'error', error }
}
