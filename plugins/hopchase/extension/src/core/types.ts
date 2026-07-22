/** A single HTTP header. Order and duplicates are preserved (HAR needs both). */
export interface Header {
  name: string
  value: string
}

/**
 * How a hop was LEFT:
 * - 'http'   server 3xx redirect (same webRequest requestId)
 * - 'meta'   client redirect matching the document's <meta http-equiv=refresh>
 * - 'js'     client redirect with doc info present but no meta-refresh match
 * - 'client' client redirect with no document evidence either way
 * - 'none'   final hop of the chain
 */
export type RedirectKind = 'http' | 'meta' | 'js' | 'client' | 'none'

export interface Hop {
  url: string
  method: string
  statusCode: number | null
  statusLine: string | null
  redirectKind: RedirectKind
  requestHeaders: Header[]
  responseHeaders: Header[]
  ip: string | null
  fromCache: boolean
  startedAt: number
  endedAt: number | null
  latencyMs: number | null
  error: string | null
}

/**
 * - 'active'   request in flight
 * - 'settled'  document loaded; may still be extended by a client redirect
 * - 'complete' finalized (superseded, tab closed, or hop cap)
 * - 'error'    ended in a network error (incl. redirect loops)
 */
export type ChainStatus = 'active' | 'settled' | 'complete' | 'error'

export interface Chain {
  id: string
  /** -1 for tracer (service-worker fetch) chains. */
  tabId: number
  hops: Hop[]
  status: ChainStatus
  startedAt: number
  endedAt: number | null
  finalUrl: string | null
  canonicalUrl: string | null
  issues: Issue[]
}

export type IssueRuleId =
  | 'too-many-hops'
  | 'temporary-redirect'
  | 'redirect-loop'
  | 'protocol-downgrade'
  | 'http-upgrade-hop'
  | 'final-error-status'
  | 'client-redirect'
  | 'canonical-mismatch'

export type IssueSeverity = 'info' | 'warning' | 'error'

export interface Issue {
  rule: IssueRuleId
  severity: IssueSeverity
  /** null = chain-level issue. */
  hopIndex: number | null
  message: string
}

/** Normalized event stream: the ONLY input the reducer consumes. */
export type ChainEvent =
  | { type: 'request-started'; requestId: string; tabId: number; url: string; method: string; at: number }
  | { type: 'request-headers'; requestId: string; tabId: number; headers: Header[]; at: number }
  | {
      type: 'redirected'
      requestId: string
      tabId: number
      fromUrl: string
      toUrl: string
      statusCode: number
      statusLine: string
      headers: Header[]
      ip: string | null
      fromCache: boolean
      at: number
    }
  | {
      type: 'completed'
      requestId: string
      tabId: number
      url: string
      statusCode: number
      statusLine: string
      headers: Header[]
      ip: string | null
      fromCache: boolean
      at: number
    }
  | { type: 'errored'; requestId: string; tabId: number; url: string; error: string; at: number }
  | { type: 'nav-committed'; tabId: number; url: string; transitionType: string; qualifiers: string[]; at: number }
  | { type: 'doc-info'; tabId: number; url: string; canonicalUrl: string | null; metaRefreshUrl: string | null; at: number }
  | { type: 'tab-removed'; tabId: number }
  | { type: 'tab-replaced'; addedTabId: number; removedTabId: number }

export interface DocInfo {
  url: string
  canonicalUrl: string | null
  metaRefreshUrl: string | null
}

export interface TabTrackState {
  chain: Chain
  /** requestId currently feeding this chain, null once settled. */
  requestId: string | null
  /** Tentative new navigation awaiting the nav-committed verdict (client redirect vs new nav). */
  candidate: { chain: Chain; requestId: string } | null
  docInfo: DocInfo | null
}

export interface TrackerState {
  version: 1
  tabs: Record<number, TabTrackState>
  /** Service-worker-originated (tracer) chains, keyed by requestId. */
  background: Record<string, Chain>
  /** Chains awaiting the service worker's drain into history. */
  finalized: Chain[]
}

export interface TraceResult {
  id: string
  url: string
  status: 'pending' | 'done' | 'error'
  chain: Chain | null
  error: string | null
  startedAt: number
}

export interface Settings {
  version: 1
  historyLimit: number
  trackSubresources: boolean
}
