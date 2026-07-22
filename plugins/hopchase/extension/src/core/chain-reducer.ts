import { CLIENT_REDIRECT_MAX_GAP_MS, ERR_HOP_CAP, MAX_HOPS } from './constants'
import { detectIssues } from './issues'
import type { Chain, ChainEvent, Header, Hop, TabTrackState, TrackerState } from './types'
import { normalizeUrl } from './url-utils'

function createHop(url: string, method: string, at: number): Hop {
  return {
    url,
    method,
    statusCode: null,
    statusLine: null,
    redirectKind: 'none',
    requestHeaders: [],
    responseHeaders: [],
    ip: null,
    fromCache: false,
    startedAt: at,
    endedAt: null,
    latencyMs: null,
    error: null,
  }
}

function createChain(tabId: number, url: string, method: string, at: number): Chain {
  return {
    id: crypto.randomUUID(),
    tabId,
    hops: [createHop(url, method, at)],
    status: 'active',
    startedAt: at,
    endedAt: null,
    finalUrl: null,
    canonicalUrl: null,
    issues: [],
  }
}

function lastHop(chain: Chain): Hop {
  return chain.hops[chain.hops.length - 1]
}

function closeHop(hop: Hop, at: number): void {
  hop.endedAt = at
  hop.latencyMs = at - hop.startedAt
}

/** Freeze a superseded chain and hand it to the service worker's history drain. */
function finalize(state: TrackerState, chain: Chain): void {
  if (chain.status !== 'error') chain.status = 'complete'
  chain.endedAt = chain.endedAt ?? lastHop(chain).endedAt
  chain.issues = detectIssues(chain)
  state.finalized.push(chain)
}

function forceHopCap(chain: Chain): void {
  const hop = lastHop(chain)
  hop.error = hop.error ?? ERR_HOP_CAP
  chain.status = 'error'
  chain.endedAt = hop.endedAt
  chain.issues = detectIssues(chain)
}

/** The chain currently owning a (tabId, requestId) pair, wherever it lives. */
function locate(
  state: TrackerState,
  tabId: number,
  requestId: string,
): { chain: Chain; tab: TabTrackState | null; isCandidate: boolean } | null {
  if (tabId === -1) {
    const chain = state.background[requestId]
    return chain ? { chain, tab: null, isCandidate: false } : null
  }
  const tab = state.tabs[tabId]
  if (!tab) return null
  if (tab.requestId === requestId) return { chain: tab.chain, tab, isCandidate: false }
  if (tab.candidate?.requestId === requestId) return { chain: tab.candidate.chain, tab, isCandidate: true }
  return null
}

function promoteCandidate(state: TrackerState, tab: TabTrackState): void {
  const candidate = tab.candidate!
  finalize(state, tab.chain)
  tab.chain = candidate.chain
  tab.requestId = candidate.chain.status === 'active' ? candidate.requestId : null
  tab.candidate = null
  tab.docInfo = null
}

function mergeCandidate(tab: TabTrackState, docMatched: boolean): void {
  const candidate = tab.candidate!
  const settled = tab.chain
  const bridge = lastHop(settled)
  bridge.redirectKind = docMatched ? 'meta' : tab.docInfo ? 'js' : 'client'
  settled.hops.push(...candidate.chain.hops)
  settled.status = candidate.chain.status
  settled.finalUrl = candidate.chain.finalUrl
  settled.endedAt = candidate.chain.status === 'active' ? null : candidate.chain.endedAt
  tab.requestId = candidate.chain.status === 'active' ? candidate.requestId : null
  tab.candidate = null
  tab.docInfo = null
  if (settled.hops.length >= MAX_HOPS) {
    forceHopCap(settled)
    tab.requestId = null
  } else if (settled.status !== 'active') {
    settled.issues = detectIssues(settled)
  }
}

export function reduce(previous: TrackerState, event: ChainEvent): TrackerState {
  const state = structuredClone(previous)

  switch (event.type) {
    case 'request-started': {
      if (event.tabId === -1) {
        // onBeforeRequest re-fires for every redirect hop with the SAME
        // requestId — only the first one opens the chain.
        if (!state.background[event.requestId]) {
          state.background[event.requestId] = createChain(-1, event.url, event.method, event.at)
        }
        break
      }
      const chain = createChain(event.tabId, event.url, event.method, event.at)
      const tab = state.tabs[event.tabId]
      if (!tab) {
        state.tabs[event.tabId] = { chain, requestId: event.requestId, candidate: null, docInfo: null }
      } else if (tab.chain.status === 'active') {
        if (tab.requestId === event.requestId) break
        // A new navigation superseded one still in flight.
        finalize(state, tab.chain)
        tab.chain = chain
        tab.requestId = event.requestId
        tab.candidate = null
      } else {
        // Settled tab: park the new navigation until nav-committed says whether
        // it was a client redirect (merge) or an unrelated navigation (promote).
        tab.candidate = { chain, requestId: event.requestId }
      }
      break
    }

    case 'request-headers': {
      const found = locate(state, event.tabId, event.requestId)
      if (found) {
        const hop = lastHop(found.chain)
        if (hop.requestHeaders.length === 0) hop.requestHeaders = event.headers
      }
      break
    }

    case 'redirected': {
      const found = locate(state, event.tabId, event.requestId)
      if (!found) break
      const { chain } = found
      const hop = lastHop(chain)
      hop.statusCode = event.statusCode
      hop.statusLine = event.statusLine
      hop.responseHeaders = event.headers
      hop.ip = event.ip
      hop.fromCache = event.fromCache
      hop.redirectKind = 'http'
      closeHop(hop, event.at)
      if (chain.hops.length >= MAX_HOPS) {
        forceHopCap(chain)
        if (found.tab && !found.isCandidate) found.tab.requestId = null
      } else {
        chain.hops.push(createHop(event.toUrl, hop.method, event.at))
      }
      break
    }

    case 'completed': {
      const found = locate(state, event.tabId, event.requestId)
      if (!found) break
      const { chain } = found
      const hop = lastHop(chain)
      hop.statusCode = event.statusCode
      hop.statusLine = event.statusLine
      hop.responseHeaders = event.headers
      hop.ip = event.ip
      hop.fromCache = event.fromCache
      hop.redirectKind = 'none'
      closeHop(hop, event.at)
      chain.status = 'settled'
      chain.finalUrl = event.url
      chain.endedAt = event.at
      chain.issues = detectIssues(chain)
      if (found.tab && !found.isCandidate) found.tab.requestId = null
      break
    }

    case 'errored': {
      const found = locate(state, event.tabId, event.requestId)
      if (!found) break
      const { chain, tab, isCandidate } = found
      if (isCandidate && event.error === 'net::ERR_ABORTED') {
        // Speculative/cancelled navigation: keep showing the settled chain.
        tab!.candidate = null
        break
      }
      const hop = lastHop(chain)
      hop.error = hop.error ?? event.error
      closeHop(hop, event.at)
      chain.status = 'error'
      chain.endedAt = event.at
      chain.issues = detectIssues(chain)
      if (isCandidate) {
        // A failed real navigation (e.g. a redirect loop) never commits, so
        // nav-committed will not arrive — promote it now.
        promoteCandidate(state, tab!)
      } else if (tab) {
        tab.requestId = null
      }
      break
    }

    case 'nav-committed': {
      const tab = state.tabs[event.tabId]
      if (!tab?.candidate) break
      const candidateStart = tab.candidate.chain.startedAt
      const gap = tab.chain.endedAt != null ? candidateStart - tab.chain.endedAt : Number.POSITIVE_INFINITY
      const canMerge =
        event.qualifiers.includes('client_redirect') &&
        tab.chain.status === 'settled' &&
        gap <= CLIENT_REDIRECT_MAX_GAP_MS
      if (canMerge) {
        const target = tab.candidate.chain.hops[0]?.url
        const docMatched =
          tab.docInfo?.metaRefreshUrl != null &&
          target != null &&
          normalizeUrl(tab.docInfo.metaRefreshUrl) === normalizeUrl(target)
        mergeCandidate(tab, docMatched)
      } else {
        promoteCandidate(state, tab)
      }
      break
    }

    case 'doc-info': {
      const tab = state.tabs[event.tabId]
      if (!tab) break
      tab.docInfo = { url: event.url, canonicalUrl: event.canonicalUrl, metaRefreshUrl: event.metaRefreshUrl }
      if (
        tab.chain.status === 'settled' &&
        tab.chain.finalUrl != null &&
        normalizeUrl(event.url) === normalizeUrl(tab.chain.finalUrl)
      ) {
        tab.chain.canonicalUrl = event.canonicalUrl
        tab.chain.issues = detectIssues(tab.chain)
      }
      break
    }

    case 'tab-removed': {
      const tab = state.tabs[event.tabId]
      if (tab) {
        finalize(state, tab.chain)
        delete state.tabs[event.tabId]
      }
      break
    }

    case 'tab-replaced': {
      const removed = state.tabs[event.removedTabId]
      if (removed && !state.tabs[event.addedTabId]) {
        removed.chain.tabId = event.addedTabId
        if (removed.candidate) removed.candidate.chain.tabId = event.addedTabId
        state.tabs[event.addedTabId] = removed
      }
      delete state.tabs[event.removedTabId]
      break
    }
  }

  return state
}

/** Pull finalized chains out of the state (service worker drains them into history). */
export function drainFinalized(state: TrackerState): { state: TrackerState; chains: Chain[] } {
  if (state.finalized.length === 0) return { state, chains: [] }
  const next = structuredClone(state)
  const chains = next.finalized
  next.finalized = []
  return { state: next, chains }
}

/** Remove a settled/errored background (tracer) chain once its result is packaged. */
export function removeBackgroundChain(state: TrackerState, requestId: string): TrackerState {
  if (!state.background[requestId]) return state
  const next = structuredClone(state)
  delete next.background[requestId]
  return next
}

/** Settled or errored background chains, ready to be packaged as trace results. */
export function settledBackgroundChains(state: TrackerState): { requestId: string; chain: Chain }[] {
  return Object.entries(state.background)
    .filter(([, chain]) => chain.status === 'settled' || chain.status === 'error')
    .map(([requestId, chain]) => ({ requestId, chain }))
}

export type { Header }
