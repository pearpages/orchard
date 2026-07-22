import {
  drainFinalized,
  reduce,
  removeBackgroundChain,
  settledBackgroundChains,
} from '../core/chain-reducer'
import { TRACE_MARKER_HEADER, createInitialTrackerState } from '../core/constants'
import {
  fromBeforeRedirect,
  fromBeforeRequest,
  fromCompleted,
  fromErrorOccurred,
  fromNavCommitted,
  fromSendHeaders,
} from '../core/normalize'
import {
  absorbChainIntoTrace,
  createTraceResult,
  failTraceResult,
  finalizeTraceResult,
  findTraceMarker,
} from '../core/trace'
import type { ChainEvent, TrackerState } from '../core/types'
import { parseMetaRefreshContent } from '../core/url-utils'
import { appendToHistory } from '../storage/history-storage'
import { loadSettings } from '../storage/settings-storage'
import { loadTraces, loadTrackerState, saveTrackerState, upsertTrace } from '../storage/tracker-storage'

let state: TrackerState | null = null
const queue: ChainEvent[] = []
let processing = false

// traceId per requestId, bound when the marker header shows up in onSendHeaders.
// In-memory only: a tracer fetch dies with the worker anyway (pending traces are
// failed on rehydration below).
const requestToTrace = new Map<string, string>()

function dispatch(event: ChainEvent | null): void {
  if (!event) return
  queue.push(event)
  void processQueue()
}

async function hydrate(): Promise<TrackerState> {
  const loaded = (await loadTrackerState()) ?? createInitialTrackerState()
  // Anything still in flight belonged to a previous worker lifetime.
  for (const requestId of Object.keys(loaded.background)) {
    if (loaded.background[requestId].status === 'active') delete loaded.background[requestId]
  }
  const traces = await loadTraces()
  for (const trace of traces) {
    if (trace.status === 'pending') {
      await upsertTrace(failTraceResult(trace, 'Interrupted: the extension worker was restarted mid-trace.'))
    }
  }
  return loaded
}

// Single consumer: events queued while the async work below awaits are picked up
// by the same loop, so reduce order always matches arrival order.
async function processQueue(): Promise<void> {
  if (processing) return
  processing = true
  try {
    while (queue.length > 0) {
      state ??= await hydrate()
      while (queue.length > 0) {
        const event = queue.shift()!
        if (event.type === 'request-headers' && event.tabId === -1) {
          const traceId = findTraceMarker(event.headers)
          if (traceId) requestToTrace.set(event.requestId, traceId)
        }
        state = reduce(state, event)
      }
      await settleBackgroundChains()
      await drainHistory()
      updateBadges()
      await saveTrackerState(state)
    }
  } finally {
    processing = false
  }
}

async function settleBackgroundChains(): Promise<void> {
  for (const { requestId, chain } of settledBackgroundChains(state!)) {
    const traceId = requestToTrace.get(requestId)
    requestToTrace.delete(requestId)
    if (traceId) {
      const trace = (await loadTraces()).find((t) => t.id === traceId)
      if (trace) await upsertTrace(absorbChainIntoTrace(trace, chain))
    }
    state = removeBackgroundChain(state!, requestId)
  }
}

async function drainHistory(): Promise<void> {
  const { state: drained, chains } = drainFinalized(state!)
  state = drained
  // Plain single-hop navigations are noise; history keeps chains that redirected
  // or carry issues.
  const worthKeeping = chains.filter((chain) => chain.hops.length > 1 || chain.issues.length > 0)
  if (worthKeeping.length > 0) {
    const settings = await loadSettings()
    await appendToHistory(worthKeeping, settings.historyLimit)
  }
}

function updateBadges(): void {
  for (const [tabIdKey, tab] of Object.entries(state!.tabs)) {
    const tabId = Number(tabIdKey)
    const redirects = tab.chain.hops.length - 1
    const hasError = tab.chain.issues.some((issue) => issue.severity === 'error')
    const text = hasError ? '!' : redirects > 0 ? String(redirects) : ''
    chrome.action.setBadgeText({ tabId, text }).catch(() => {})
    chrome.action
      .setBadgeBackgroundColor({ tabId, color: hasError ? '#d64545' : '#3b6ef6' })
      .catch(() => {})
  }
}

async function collectDocInfo(tabId: number, url: string, at: number): Promise<void> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        canonicalHref: document.querySelector('link[rel="canonical" i]')?.getAttribute('href') ?? null,
        metaRefreshContent:
          document.querySelector('meta[http-equiv="refresh" i]')?.getAttribute('content') ?? null,
      }),
    })
    const result = injection?.result
    if (!result) return
    let canonicalUrl: string | null = null
    if (result.canonicalHref) {
      try {
        canonicalUrl = new URL(result.canonicalHref, url).toString()
      } catch {
        canonicalUrl = null
      }
    }
    const metaRefreshUrl = result.metaRefreshContent
      ? parseMetaRefreshContent(result.metaRefreshContent, url)
      : null
    dispatch({ type: 'doc-info', tabId, url, canonicalUrl, metaRefreshUrl, at })
  } catch {
    // chrome://, the Web Store, PDFs: not injectable, and that is fine.
  }
}

async function startTrace(traceId: string, url: string): Promise<void> {
  await upsertTrace(createTraceResult(traceId, url, Date.now()))
  let fetchError: string | null = null
  try {
    await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      headers: { [TRACE_MARKER_HEADER]: traceId },
    })
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error)
  }
  // The fetch resolves at response headers; give trailing webRequest events a
  // moment to land, then settle whatever the event stream left pending (e.g. a
  // fetch aborted by Chrome's own redirect cap, or an unfetchable URL).
  await new Promise((resolve) => setTimeout(resolve, 500))
  const trace = (await loadTraces()).find((t) => t.id === traceId)
  if (trace?.status === 'pending') {
    await upsertTrace(fetchError ? failTraceResult(trace, fetchError) : finalizeTraceResult(trace))
  }
}

// --- listeners: all registered synchronously at top level (MV3 wake requirement) ---

const REQUEST_FILTER: chrome.webRequest.RequestFilter = {
  urls: ['<all_urls>'],
  types: ['main_frame', 'xmlhttprequest'],
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    dispatch(fromBeforeRequest(details))
  },
  REQUEST_FILTER,
)
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    dispatch(fromSendHeaders(details))
  },
  REQUEST_FILTER,
  ['requestHeaders'],
)
chrome.webRequest.onBeforeRedirect.addListener(
  (details) => dispatch(fromBeforeRedirect(details)),
  REQUEST_FILTER,
  ['responseHeaders', 'extraHeaders'],
)
chrome.webRequest.onCompleted.addListener(
  (details) => dispatch(fromCompleted(details)),
  REQUEST_FILTER,
  ['responseHeaders', 'extraHeaders'],
)
chrome.webRequest.onErrorOccurred.addListener((details) => dispatch(fromErrorOccurred(details)), REQUEST_FILTER)

chrome.webNavigation.onCommitted.addListener((details) => dispatch(fromNavCommitted(details)))

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0 || details.tabId < 0) return
  void collectDocInfo(details.tabId, details.url, details.timeStamp)
})

chrome.webNavigation.onTabReplaced.addListener((details) => {
  dispatch({ type: 'tab-replaced', addedTabId: details.tabId, removedTabId: details.replacedTabId })
})

chrome.tabs.onRemoved.addListener((tabId) => dispatch({ type: 'tab-removed', tabId }))

chrome.runtime.onMessage.addListener((message: { type?: string; url?: string }, _sender, sendResponse) => {
  if (message?.type === 'trace' && typeof message.url === 'string') {
    const traceId = crypto.randomUUID()
    sendResponse({ traceId })
    void startTrace(traceId, message.url)
  }
  return false
})
