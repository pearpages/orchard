import { createInitialTrackerState } from '../constants'
import { reduce } from '../chain-reducer'
import type { Chain, ChainEvent, Hop, TrackerState } from '../types'

export function run(events: ChainEvent[], initial: TrackerState = createInitialTrackerState()): TrackerState {
  return events.reduce(reduce, initial)
}

/** What chrome.storage.session round-trips do to the state between SW lifetimes. */
export function roundTrip(state: TrackerState): TrackerState {
  return JSON.parse(JSON.stringify(state)) as TrackerState
}

/** Chain ids are random UUIDs — normalize them so two runs can be compared. */
export function stripIds(state: TrackerState): TrackerState {
  const clone = roundTrip(state)
  const wipe = (chain: Chain) => {
    chain.id = 'id'
  }
  for (const tab of Object.values(clone.tabs)) {
    wipe(tab.chain)
    if (tab.candidate) wipe(tab.candidate.chain)
  }
  Object.values(clone.background).forEach(wipe)
  clone.finalized.forEach(wipe)
  return clone
}

interface ServerChainOptions {
  tabId?: number
  requestId?: string
  urls?: string[]
  statuses?: number[]
  startAt?: number
  stepMs?: number
}

/**
 * The webRequest event sequence for a server-side redirect chain ending in a 200:
 * request-started, then one `redirected` per intermediate URL, then `completed`.
 */
export function serverChainEvents(options: ServerChainOptions = {}): ChainEvent[] {
  const {
    tabId = 1,
    requestId = 'r1',
    urls = ['https://a.example/', 'https://b.example/', 'https://c.example/'],
    statuses = [301, 302],
    startAt = 1_000,
    stepMs = 100,
  } = options
  const events: ChainEvent[] = [
    { type: 'request-started', requestId, tabId, url: urls[0], method: 'GET', at: startAt },
    {
      type: 'request-headers',
      requestId,
      tabId,
      headers: [{ name: 'User-Agent', value: 'test' }],
      at: startAt + 1,
    },
  ]
  let at = startAt
  for (let i = 0; i < urls.length - 1; i += 1) {
    at += stepMs
    events.push({
      type: 'redirected',
      requestId,
      tabId,
      fromUrl: urls[i],
      toUrl: urls[i + 1],
      statusCode: statuses[i] ?? 301,
      statusLine: `HTTP/1.1 ${statuses[i] ?? 301}`,
      headers: [{ name: 'location', value: urls[i + 1] }],
      ip: '203.0.113.7',
      fromCache: false,
      at,
    })
  }
  at += stepMs
  events.push({
    type: 'completed',
    requestId,
    tabId,
    url: urls[urls.length - 1],
    statusCode: 200,
    statusLine: 'HTTP/1.1 200 OK',
    headers: [{ name: 'content-type', value: 'text/html' }],
    ip: '203.0.113.7',
    fromCache: false,
    at,
  })
  return events
}

export function makeHop(overrides: Partial<Hop> = {}): Hop {
  return {
    url: 'https://example.com/',
    method: 'GET',
    statusCode: 200,
    statusLine: 'HTTP/1.1 200 OK',
    redirectKind: 'none',
    requestHeaders: [],
    responseHeaders: [],
    ip: null,
    fromCache: false,
    startedAt: 1_000,
    endedAt: 1_100,
    latencyMs: 100,
    error: null,
    ...overrides,
  }
}

export function makeChain(overrides: Partial<Chain> = {}): Chain {
  return {
    id: 'chain-1',
    tabId: 1,
    hops: [makeHop()],
    status: 'settled',
    startedAt: 1_000,
    endedAt: 1_100,
    finalUrl: 'https://example.com/',
    canonicalUrl: null,
    issues: [],
    ...overrides,
  }
}

/** A settled chain built through the reducer, plus the tab/request ids used. */
export function settledState(options: ServerChainOptions = {}): TrackerState {
  return run(serverChainEvents(options))
}
