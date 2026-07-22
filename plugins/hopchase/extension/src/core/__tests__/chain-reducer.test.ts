import { describe, expect, it } from 'vitest'
import { reduce, removeBackgroundChain, settledBackgroundChains, drainFinalized } from '../chain-reducer'
import { CLIENT_REDIRECT_MAX_GAP_MS, ERR_HOP_CAP, ERR_TOO_MANY_REDIRECTS, MAX_HOPS } from '../constants'
import type { ChainEvent } from '../types'
import { roundTrip, run, serverChainEvents, settledState, stripIds } from './factories'

describe('server redirect chains', () => {
  it('reconstructs a 301→302→200 chain with per-hop latency', () => {
    const state = settledState()
    const tab = state.tabs[1]
    const { hops } = tab.chain
    expect(hops).toHaveLength(3)
    expect(hops.map((h) => h.statusCode)).toEqual([301, 302, 200])
    expect(hops.map((h) => h.redirectKind)).toEqual(['http', 'http', 'none'])
    expect(hops.map((h) => h.latencyMs)).toEqual([100, 100, 100])
    expect(hops[0].requestHeaders).toEqual([{ name: 'User-Agent', value: 'test' }])
    expect(hops[1].responseHeaders).toEqual([{ name: 'location', value: 'https://c.example/' }])
    expect(tab.chain.status).toBe('settled')
    expect(tab.chain.finalUrl).toBe('https://c.example/')
    expect(tab.requestId).toBeNull()
  })

  it('flags the chain issues on settle (too-many-hops for 3+ redirects is absent here)', () => {
    const state = settledState()
    expect(state.tabs[1].chain.issues.map((i) => i.rule)).toEqual([
      'temporary-redirect', // the 302 hop
    ])
  })

  it('marks the chain as errored on a network error and records the loop issue', () => {
    const events = serverChainEvents().slice(0, -1) // drop `completed`
    events.push({
      type: 'errored',
      requestId: 'r1',
      tabId: 1,
      url: 'https://c.example/',
      error: ERR_TOO_MANY_REDIRECTS,
      at: 2_000,
    })
    const chain = run(events).tabs[1].chain
    expect(chain.status).toBe('error')
    expect(chain.hops[chain.hops.length - 1].error).toBe(ERR_TOO_MANY_REDIRECTS)
    expect(chain.issues.some((i) => i.rule === 'redirect-loop' && i.severity === 'error')).toBe(true)
  })

  it('force-finalizes at MAX_HOPS with a synthetic hop-cap error', () => {
    const events: ChainEvent[] = [
      { type: 'request-started', requestId: 'r1', tabId: 1, url: 'https://x.example/0', method: 'GET', at: 0 },
    ]
    for (let i = 0; i < MAX_HOPS + 5; i += 1) {
      events.push({
        type: 'redirected',
        requestId: 'r1',
        tabId: 1,
        fromUrl: `https://x.example/${i}`,
        toUrl: `https://x.example/${i + 1}`,
        statusCode: 302,
        statusLine: 'HTTP/1.1 302 Found',
        headers: [],
        ip: null,
        fromCache: false,
        at: (i + 1) * 10,
      })
    }
    const chain = run(events).tabs[1].chain
    expect(chain.hops.length).toBe(MAX_HOPS)
    expect(chain.status).toBe('error')
    expect(chain.hops[chain.hops.length - 1].error).toBe(ERR_HOP_CAP)
    expect(chain.issues.some((i) => i.rule === 'redirect-loop')).toBe(true)
  })

  it('finalizes an in-flight chain superseded by a new navigation', () => {
    const events: ChainEvent[] = [
      { type: 'request-started', requestId: 'r1', tabId: 1, url: 'https://slow.example/', method: 'GET', at: 0 },
      { type: 'request-started', requestId: 'r2', tabId: 1, url: 'https://next.example/', method: 'GET', at: 50 },
    ]
    const state = run(events)
    expect(state.finalized).toHaveLength(1)
    expect(state.finalized[0].hops[0].url).toBe('https://slow.example/')
    expect(state.tabs[1].chain.hops[0].url).toBe('https://next.example/')
    expect(state.tabs[1].requestId).toBe('r2')
  })
})

describe('client-redirect linking', () => {
  const candidateStart = (state = settledState()) => {
    const settledAt = state.tabs[1].chain.endedAt!
    return { state, at: settledAt + 500 }
  }

  it('parks a new navigation as candidate until nav-committed decides', () => {
    const { state, at } = candidateStart()
    const next = reduce(state, {
      type: 'request-started',
      requestId: 'r2',
      tabId: 1,
      url: 'https://d.example/',
      method: 'GET',
      at,
    })
    expect(next.tabs[1].candidate?.requestId).toBe('r2')
    expect(next.tabs[1].chain.finalUrl).toBe('https://c.example/') // still showing the settled chain
  })

  it('merges on the client_redirect qualifier, labeling the bridge hop', () => {
    const { state, at } = candidateStart()
    const merged = run(
      [
        { type: 'request-started', requestId: 'r2', tabId: 1, url: 'https://d.example/', method: 'GET', at },
        {
          type: 'nav-committed',
          tabId: 1,
          url: 'https://d.example/',
          transitionType: 'link',
          qualifiers: ['client_redirect'],
          at: at + 10,
        },
        {
          type: 'completed',
          requestId: 'r2',
          tabId: 1,
          url: 'https://d.example/',
          statusCode: 200,
          statusLine: 'HTTP/1.1 200 OK',
          headers: [],
          ip: null,
          fromCache: false,
          at: at + 100,
        },
      ],
      state,
    )
    const chain = merged.tabs[1].chain
    expect(chain.hops).toHaveLength(4)
    expect(chain.hops[2].redirectKind).toBe('client') // no doc-info evidence
    expect(chain.status).toBe('settled')
    expect(chain.finalUrl).toBe('https://d.example/')
    expect(chain.issues.some((i) => i.rule === 'too-many-hops')).toBe(true) // 3 redirects now
    expect(chain.issues.some((i) => i.rule === 'client-redirect')).toBe(true)
  })

  it('labels the bridge hop meta/js based on doc-info evidence', () => {
    const { state, at } = candidateStart()
    const withDocInfo = (metaRefreshUrl: string | null) =>
      run(
        [
          {
            type: 'doc-info',
            tabId: 1,
            url: 'https://c.example/',
            canonicalUrl: null,
            metaRefreshUrl,
            at: at - 100,
          },
          { type: 'request-started', requestId: 'r2', tabId: 1, url: 'https://d.example/', method: 'GET', at },
          {
            type: 'nav-committed',
            tabId: 1,
            url: 'https://d.example/',
            transitionType: 'link',
            qualifiers: ['client_redirect'],
            at: at + 10,
          },
        ],
        state,
      ).tabs[1].chain
    expect(withDocInfo('https://d.example/').hops[2].redirectKind).toBe('meta')
    expect(withDocInfo(null).hops[2].redirectKind).toBe('js')
  })

  it('promotes instead of merging when there is no client_redirect qualifier', () => {
    const { state, at } = candidateStart()
    const next = run(
      [
        { type: 'request-started', requestId: 'r2', tabId: 1, url: 'https://d.example/', method: 'GET', at },
        {
          type: 'nav-committed',
          tabId: 1,
          url: 'https://d.example/',
          transitionType: 'typed',
          qualifiers: [],
          at: at + 10,
        },
      ],
      state,
    )
    expect(next.finalized).toHaveLength(1)
    expect(next.finalized[0].status).toBe('complete')
    expect(next.tabs[1].chain.hops[0].url).toBe('https://d.example/')
  })

  it('vetoes a merge across a gap longer than CLIENT_REDIRECT_MAX_GAP_MS', () => {
    const state = settledState()
    const at = state.tabs[1].chain.endedAt! + CLIENT_REDIRECT_MAX_GAP_MS + 1
    const next = run(
      [
        { type: 'request-started', requestId: 'r2', tabId: 1, url: 'https://d.example/', method: 'GET', at },
        {
          type: 'nav-committed',
          tabId: 1,
          url: 'https://d.example/',
          transitionType: 'link',
          qualifiers: ['client_redirect'],
          at: at + 10,
        },
      ],
      state,
    )
    expect(next.finalized).toHaveLength(1) // promoted, not merged
    expect(next.tabs[1].chain.hops).toHaveLength(1)
  })

  it('drops an aborted candidate but promotes a genuinely failed one', () => {
    const { state, at } = candidateStart()
    const start: ChainEvent = {
      type: 'request-started',
      requestId: 'r2',
      tabId: 1,
      url: 'https://d.example/',
      method: 'GET',
      at,
    }
    const aborted = run(
      [start, { type: 'errored', requestId: 'r2', tabId: 1, url: 'https://d.example/', error: 'net::ERR_ABORTED', at: at + 10 }],
      state,
    )
    expect(aborted.tabs[1].candidate).toBeNull()
    expect(aborted.tabs[1].chain.finalUrl).toBe('https://c.example/')

    // A redirect loop never commits, so the errored candidate must be promoted.
    const failed = run(
      [start, { type: 'errored', requestId: 'r2', tabId: 1, url: 'https://d.example/', error: ERR_TOO_MANY_REDIRECTS, at: at + 10 }],
      state,
    )
    expect(failed.finalized).toHaveLength(1)
    expect(failed.tabs[1].chain.status).toBe('error')
    expect(failed.tabs[1].chain.hops[0].url).toBe('https://d.example/')
  })
})

describe('doc-info and tab lifecycle', () => {
  it('attaches the canonical URL to the settled chain and recomputes issues', () => {
    const state = reduce(settledState(), {
      type: 'doc-info',
      tabId: 1,
      url: 'https://c.example/',
      canonicalUrl: 'https://canonical.example/',
      metaRefreshUrl: null,
      at: 2_000,
    })
    expect(state.tabs[1].chain.canonicalUrl).toBe('https://canonical.example/')
    expect(state.tabs[1].chain.issues.some((i) => i.rule === 'canonical-mismatch')).toBe(true)
  })

  it('finalizes the chain when the tab is removed', () => {
    const state = reduce(settledState(), { type: 'tab-removed', tabId: 1 })
    expect(state.tabs[1]).toBeUndefined()
    expect(state.finalized).toHaveLength(1)
    expect(state.finalized[0].status).toBe('complete')
  })

  it('rekeys tab state when a prerendered tab replaces the visible one', () => {
    const state = reduce(settledState({ tabId: 7 }), { type: 'tab-replaced', addedTabId: 9, removedTabId: 7 })
    expect(state.tabs[7]).toBeUndefined()
    expect(state.tabs[9].chain.tabId).toBe(9)
  })

  it('drains finalized chains', () => {
    const state = reduce(settledState(), { type: 'tab-removed', tabId: 1 })
    const { state: drained, chains } = drainFinalized(state)
    expect(chains).toHaveLength(1)
    expect(drained.finalized).toHaveLength(0)
  })
})

describe('background (tracer) chains', () => {
  it('survives the re-fired request-started per redirect hop (same requestId)', () => {
    // Real Chrome order for a service-worker fetch: START a, REDIRECT 301,
    // START b, REDIRECT 302, START c, DONE — one requestId throughout.
    const events = serverChainEvents({ tabId: -1, requestId: 'bg1' })
    const withRestarts: ChainEvent[] = []
    for (const event of events) {
      withRestarts.push(event)
      if (event.type === 'redirected') {
        withRestarts.push({
          type: 'request-started',
          requestId: 'bg1',
          tabId: -1,
          url: event.toUrl,
          method: 'GET',
          at: event.at,
        })
      }
    }
    const state = run(withRestarts)
    const settled = settledBackgroundChains(state)
    expect(settled).toHaveLength(1)
    expect(settled[0].chain.hops.map((h) => h.statusCode)).toEqual([301, 302, 200])
  })

  it('tracks tabId -1 chains by requestId and surfaces settled ones', () => {
    const state = run(serverChainEvents({ tabId: -1, requestId: 'bg1' }))
    expect(state.tabs[-1]).toBeUndefined()
    const settled = settledBackgroundChains(state)
    expect(settled).toHaveLength(1)
    expect(settled[0].requestId).toBe('bg1')
    expect(settled[0].chain.hops).toHaveLength(3)
    const removed = removeBackgroundChain(state, 'bg1')
    expect(settledBackgroundChains(removed)).toHaveLength(0)
  })
})

describe('rehydration', () => {
  it('a storage round-trip mid-chain (service worker death) changes nothing', () => {
    const events = serverChainEvents()
    const uninterrupted = run(events)
    const firstHalf = run(events.slice(0, 3))
    const resumed = run(events.slice(3), roundTrip(firstHalf))
    expect(stripIds(resumed)).toEqual(stripIds(uninterrupted))
  })
})
