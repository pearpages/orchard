import { describe, expect, it } from 'vitest'
import { ERR_TOO_MANY_REDIRECTS, TRACE_MARKER_HEADER } from '../constants'
import {
  absorbChainIntoTrace,
  createTraceResult,
  failTraceResult,
  finalizeTraceResult,
  findTraceMarker,
} from '../trace'
import { makeChain, makeHop } from './factories'

describe('findTraceMarker', () => {
  it('finds the marker header case-insensitively', () => {
    expect(findTraceMarker([{ name: 'X-HopChase-Trace', value: 't1' }])).toBe('t1')
    expect(findTraceMarker([{ name: 'accept', value: '*/*' }])).toBeNull()
  })
})

describe('absorbChainIntoTrace', () => {
  const marker = { name: TRACE_MARKER_HEADER, value: 't1' }

  it('accumulates per-requestId chains, relabeling completed 3xx hops as redirects', () => {
    const trace = createTraceResult('t1', 'https://a.example/', 1_000)
    const first = absorbChainIntoTrace(
      trace,
      makeChain({
        tabId: -1,
        hops: [
          makeHop({
            url: 'https://a.example/',
            statusCode: 301,
            requestHeaders: [marker, { name: 'accept', value: '*/*' }],
          }),
        ],
        finalUrl: 'https://a.example/',
      }),
    )
    expect(first.status).toBe('pending') // last hop is a 3xx: the follow-up is coming
    expect(first.chain?.hops[0].requestHeaders).toEqual([{ name: 'accept', value: '*/*' }])

    const second = absorbChainIntoTrace(
      first,
      makeChain({
        tabId: -1,
        hops: [makeHop({ url: 'https://b.example/', statusCode: 200, requestHeaders: [marker] })],
        finalUrl: 'https://b.example/',
      }),
    )
    expect(second.status).toBe('done')
    expect(second.chain?.hops).toHaveLength(2)
    expect(second.chain?.hops[0].redirectKind).toBe('http') // relabeled bridge
    expect(second.chain?.hops[1].redirectKind).toBe('none')
    expect(second.chain?.startedAt).toBe(1_000)
  })

  it('recomputes issues on the merged chain', () => {
    const trace = createTraceResult('t1', 'https://a.example/', 1_000)
    const first = absorbChainIntoTrace(
      trace,
      makeChain({ tabId: -1, hops: [makeHop({ url: 'https://a.example/', statusCode: 302 })] }),
    )
    const second = absorbChainIntoTrace(
      first,
      makeChain({ tabId: -1, hops: [makeHop({ url: 'https://b.example/', statusCode: 200 })] }),
    )
    expect(second.chain?.issues.some((i) => i.rule === 'temporary-redirect')).toBe(true)
  })

  it('propagates an errored chain', () => {
    const trace = createTraceResult('t1', 'https://a.example/', 1_000)
    const failed = absorbChainIntoTrace(
      trace,
      makeChain({
        tabId: -1,
        status: 'error',
        hops: [makeHop({ error: ERR_TOO_MANY_REDIRECTS, statusCode: null })],
        finalUrl: null,
      }),
    )
    expect(failed.status).toBe('error')
    expect(failed.error).toBe(ERR_TOO_MANY_REDIRECTS)
  })
})

describe('finalizeTraceResult', () => {
  it('marks a pending trace with hops as done, an empty one as failed', () => {
    const empty = createTraceResult('t1', 'https://a.example/', 1_000)
    expect(finalizeTraceResult(empty).status).toBe('error')

    const withChain = { ...empty, chain: makeChain() }
    expect(finalizeTraceResult(withChain).status).toBe('done')
  })

  it('leaves a settled trace untouched', () => {
    const done = { ...createTraceResult('t1', 'https://a.example/', 1_000), status: 'done' as const }
    expect(finalizeTraceResult(done)).toBe(done)
  })
})

describe('failTraceResult', () => {
  it('fails a trace, keeping any partial chain', () => {
    const trace = { ...createTraceResult('t1', 'https://a.example/', 1_000), chain: makeChain() }
    const failed = failTraceResult(trace, 'fetch failed')
    expect(failed.status).toBe('error')
    expect(failed.chain).not.toBeNull()
  })
})
